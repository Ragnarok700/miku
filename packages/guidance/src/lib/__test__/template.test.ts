import { TemplateProcessor } from '../template';
import { LLaMATokenizer } from '../tokenizer'; // import paths as required
import { AbstractTokenGenerator } from '../token-generator';

class MockTokenGenerator extends AbstractTokenGenerator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
   override async generateToken(prompt: string, logit_bias: Record<string, number>): Promise<string> {
      return '<TOK>';
   }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async generateString(prompt: string, options: Record<string, string>): Promise<string> {
      return 'generated';
  }
}

describe('TemplateProcessor', () => {
  let tokenizer: LLaMATokenizer;
  let generator: MockTokenGenerator;
  let templateProcessor: TemplateProcessor;

  beforeEach(() => {
    tokenizer = new LLaMATokenizer();
    generator = new MockTokenGenerator();
    templateProcessor = new TemplateProcessor(tokenizer, generator);
  });

  describe('processTemplate', () => {
    it('should process template with GEN method correctly', async () => {
      const spyGenerateString = jest.spyOn(generator, 'generateString');
      const result = await templateProcessor.processTemplate(
        'Hello, {{user}}. The weather is {{GEN weather}}',
        new Map([['user', 'Hina']])
      );
      expect(spyGenerateString).toHaveBeenCalledWith('Hello, Hina. The weather is ', {})
      expect(result.get('weather')).toEqual('generated');
    });

    it('should process template with GEN method and stop correctly', async () => {
      const spyGenerateString = jest.spyOn(generator, 'generateString');
      const result = await templateProcessor.processTemplate(
        'Hello, {{user}}. The weather is {{GEN weather stop=.}}',
        new Map([['user', 'Hina']])
      );
      expect(spyGenerateString).toHaveBeenCalledWith('Hello, Hina. The weather is ', { stop: '.' })
      expect(result.get('weather')).toEqual('generated');
    });

    it('should process template with GEN method and temperature and repetition_penalty and stop correctly', async () => {
      const spyGenerateString = jest.spyOn(generator, 'generateString');
      const result = await templateProcessor.processTemplate(
        'Hello, {{user}}. The weather is {{GEN weather temperature=0.5 repetition_penalty=1 stop=.}}',
        new Map([['user', 'Hina']])
      );
      expect(spyGenerateString).toHaveBeenCalledWith('Hello, Hina. The weather is ', { temperature: '0.5', repetition_penalty: '1', stop: '.' })
      expect(result.get('weather')).toEqual('generated');
    });

    it('should process template with SEL method correctly', async () => {
      // 1153 = " ra"
      const spyGenerateToken = jest.spyOn(generator, 'generateToken').mockReturnValue(new Promise((resolve) => resolve(" ra")));
      const result = await templateProcessor.processTemplate(
        'Hello, {{user}}. The weather is{{SEL weather options=weatherOptions}}',
        new Map<string, string | string[]>([
          ['user', 'Hina'],
          ['weatherOptions', [' sunny', ' rainy', ' cloudy']]
        ])
      );
      expect(spyGenerateToken).toHaveBeenCalledWith('Hello, Hina. The weather is', {
        '6575': 100,
        '1153': 100,
        '9570': 100
      })
      expect(result.get('weather')).toEqual(' rainy');
    });

    it('should process template with SEL method in a JSON correctly', async () => {
      // 29879 = "s"
      const spyGenerateToken = jest.spyOn(generator, 'generateToken').mockReturnValue(new Promise((resolve) => resolve("s")));
      const spyGenerateString = jest.spyOn(generator, 'generateString').mockReturnValue(new Promise((resolve) => resolve("wizard")));
      const result = await templateProcessor.processTemplate(
        `RPG Game Character specification
        {
          "name": "{{name}}",
          "job": "{{GEN job stop=",}}",
          "weapon": "{{SEL weapon options=valid_weapons}}",
        }`,
        new Map<string, string[] | string>([
          ['name', 'Rudeus'],
          ['valid_weapons', ["axe", "mace", "sword", "bow", "crossbow"]],
        ])
      );
      expect(spyGenerateString).toHaveBeenCalledWith(
        'RPG Game Character specification\n        {\n          "name": "Rudeus",\n          "job": "',
        { stop: '",'}
      )
      expect(spyGenerateToken).toHaveBeenCalledWith(
        'RPG Game Character specification\n        {\n          "name": "Rudeus",\n          "job": "wizard",\n          "weapon": "',
        {
          '29879': 100,
          '1165': 100,
          '655': 100,
          '17729': 100,
          '19128': 100,
        }
      )
      expect(result.get('weapon')).toEqual('sword');
      expect(result.get('job')).toEqual('wizard');
    });
  });
});