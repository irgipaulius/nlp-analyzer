export interface IntentTest {
  defined_intent: string;

  query: string;
  response_intent: string;

  delta_time: number;
  test_data: TestDataIntent;
}
/**s
 * @param ratio_falsenegatives ratio of annotated text, which shouldn't have been annotated
 * @param ratio_falsepositives ratio of unannotated text, which should have been annotated
 * @param ratio_truenegatives ratio of annotated text, which correctly did not annotate the text
 * @param ratio_truepositives ratio of annotated text, which correctly annotated the text
 */
export interface IntentTestResults {
  api: string;

  average_time: number;
  minimum_time: number;
  maximum_time: number;

  number_tests: number;
  number_correct: number;
  number_failed: number;

  number_typoed: number;
  number_failed_typoed: number;
  number_correct_typoed: number;

  number_falsepositives: number;
  number_falsenegatives: number;
  number_truepositives: number;
  number_truenegatives: number;

  ratio_falsepositives: number;
  ratio_falsenegatives: number;

  ratio_truepositives: number;
  ratio_truenegatives: number;

  precision: number;
  recall: number;
  mean: number;

  correct: Array<IntentTest>;
  failed: Array<IntentTest>;
  [x: string]: any;
}

export interface SentimentTest {
  query: string;
  response_sentiment: string;
  delta_time: number;
  defined_sentiment: string;
  test_data: TestDataSentiment;
}

export interface SentimentTestResults {
  api: string;

  average_time: number;
  minimum_time: number;
  maximum_time: number;

  number_tests: number;
  number_failed: number;
  number_correct: number;

  number_typoed: number;
  number_failed_typoed: number;
  number_correct_typoed: number;

  number_falsepositives: number;
  number_falsenegatives: number;
  number_truepositives: number;
  number_truenegatives: number;

  ratio_falsepositives: number;
  ratio_falsenegatives: number;

  ratio_truepositives: number;
  ratio_truenegatives: number;

  recall: number;
  precision: number;
  mean: number;

  failed: Array<SentimentTest>;
  correct: Array<SentimentTest>;
  [x: string]: any;
}

export interface Results {
  intent: IntentTestResults;
  sentiment: SentimentTestResults;
}

export interface Input {
  api: string;
  uri: string;
  useData: boolean;
  data: any;
}

export enum Api {
  Luis,
  Watson,
  Wit,
  DialogFlow,
  ParallelDots,
  Geneea,
  Alquist
}

export interface TestData {
  IntentTesting: Array<TestDataIntent>;
  SentimentTesting: Array<TestDataSentiment>;
}

export interface TestDataSentiment {
  sentence: string;
  sentiment: string;
  typo: boolean;
}

export interface TestDataIntent {
  sentence: string;
  intent: string;
  typo: boolean;
}

interface GeneeaIntent {
  args: Array<{}>;
  confidence: number;
  name: string;
}
export interface GeneeaResponse {
  allIntents: Array<GeneeaIntent>;
  mainIntent: GeneeaIntent;
}

export interface AlquistResponse {
  answer: string;
  confidence: number;
  hit: string;
}

export interface LuisResponse {
  query: string;
  alteredQuery: string;
  topScoringIntent: LuisResponseIntent;
  entities: Array<LuisResponseEntity>;
  sentimentAnalysis: {
    label: string;
    score: number;
  };
}

export interface LuisResponseIntent {
  intent: string;
  score: number;
}

export interface LuisResponseEntity {
  entity: string;
  type: string;
  startIndex: number;
  endIndex: number;
  resolution: { values: Array<string> };
}

export interface DialogFlowResponse {
  responseId: string;
  queryResult: {
    queryText: string;
    parameters: any;
    allRequiredParamsPresent: boolean;
    fulfillmentMessages: [
      {
        text: {
          text: Array<string>;
        };
      }
    ];
    intent: {
      name: string;
      displayName: string;
    };
    intentDetectionConfidence: number;
    languageCode: string;
  };
}

export interface WitResponse {
  _text: string;
  entities: {
    sentiment: [
      {
        confidence: number;
        value: string;
      }
    ];
    intent: [
      {
        confidence: number;
        value: string;
      }
    ];
  };
  msg_id: string;
}
