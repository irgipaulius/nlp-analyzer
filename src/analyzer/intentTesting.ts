import chalk from "chalk";
import util from "util";
import request from "request";

import {
  calculateAverage,
  calculateRatio,
  getEndpointUrl,
  calculateRecall,
  calculatePrecision,
  calculateMean
} from "./";

import {
  Api,
  LuisResponse,
  TestData,
  TestDataIntent,
  WitResponse,
  GeneeaResponse,
  AlquistResponse,
  IntentTestResults,
  IntentTest
} from "./types";

export function IntentRecognitionTest(
  api: Api,
  testData: TestData
): Promise<IntentTestResults> {
  return new Promise<IntentTestResults>((resolve, reject) => {
    if (testData.IntentTesting) {
      const endpointUrl = getEndpointUrl(api);
      if (endpointUrl) {
        let testSuite: Array<Promise<IntentTest>> = testData.IntentTesting.map(
          intentTest => IntentQuery(api, intentTest, endpointUrl)
        );

        Promise.all(testSuite)
          .then(results => {
            // when all intent tests are completed.

            let all = new Set(results);

            // count correctly and incorrectly annotated text
            let allTrue = new Set(
              results.filter(x => x.defined_intent === x.response_intent)
            );
            let allFalse = new Set(results.filter(x => !allTrue.has(x)));

            //negatives - text which shouldn't be annotated
            let allNegatives = new Set(
              results.filter(x => "None" === x.defined_intent)
            );
            //positives - text which should be annotated
            let allPositives = new Set(
              results.filter(x => "None" !== x.defined_intent)
            );

            // true negatives - correct if text wasn't annotated , None - None
            let allTrueNegatives = new Set(
              Array.from(allNegatives).filter(x => allTrue.has(x))
            );
            // false negatives - incorrect if text was annotated , None - robot
            let allFalseNegatives = new Set(
              Array.from(allNegatives).filter(x => allFalse.has(x))
            );

            // true positives - correct if text was annotated , robot - robot
            let allTruePositives = new Set(
              Array.from(allPositives).filter(x => allTrue.has(x))
            );
            // false negatives - incorrect if text wasn't annotated , robot - None
            let allFalsePositives = new Set(
              Array.from(allPositives).filter(x => allFalse.has(x))
            );

            // count how many of the answered had a typo
            let typoed = results.filter(x => x.test_data.typo);
            let typoedCorrect = new Set(typoed.filter(x => allTrue.has(x)));
            let typoedIncorrect = new Set(typoed.filter(x => allFalse.has(x)));

            // collect delta_time from each query
            let timings = results.map(x => x.delta_time);

            // do some more complicated calculations
            let precision = calculatePrecision(
              allTruePositives.size,
              allFalsePositives.size
            );
            let recall = calculateRecall(
              allTruePositives.size,
              allFalseNegatives.size
            );
            let mean = calculateMean(precision, recall);

            let result: IntentTestResults = {
              api: Api[api],

              average_time: calculateAverage(timings),
              minimum_time: Math.min(...timings),
              maximum_time: Math.max(...timings),

              number_tests: results.length,
              number_correct: allTrue.size,
              number_failed: allFalse.size,

              number_typoed: typoed.length,
              number_correct_typoed: typoedCorrect.size,
              number_failed_typoed: typoedIncorrect.size,

              number_falsenegatives: allFalseNegatives.size,
              number_falsepositives: allFalsePositives.size,
              number_truenegatives: allTrueNegatives.size,
              number_truepositives: allTruePositives.size,

              correct: Array.from(allTrue),
              failed: Array.from(allFalse),

              ratio_falsenegatives: calculateRatio(
                allFalseNegatives.size,
                all.size
              ),
              ratio_falsepositives: calculateRatio(
                allFalsePositives.size,
                all.size
              ),
              ratio_truenegatives: calculateRatio(
                allTrueNegatives.size,
                all.size
              ),
              ratio_truepositives: calculateRatio(
                allTruePositives.size,
                all.size
              ),

              precision,
              recall,
              mean
            };
            resolve(result);
          })
          .catch(err => {
            console.log("Error in one of the Intent test requests");
            reject(err);
          });
      } else {
        reject("no endpoint url defined for " + Api[api]);
      }
    } else {
      let msg = "Intent Test Deactivated, because testing data is not provided";
      console.log(chalk.yellow(msg));
      resolve(undefined);
    }
  });
}

function IntentQuery(
  api: Api,
  intentTestData: TestDataIntent,
  endpointUrl: string
): Promise<IntentTest> {
  return new Promise<IntentTest>((resolve, reject) => {
    // set up intent test
    sendRequest(api, endpointUrl, intentTestData)
      .then(body => {
        //successful request
        let response_intent = readResponseBody(api, body);

        const result: IntentTest = {
          query: intentTestData.sentence,
          delta_time: (body && body.elapsedTime) || 0,
          test_data: intentTestData,
          defined_intent: intentTestData.intent,
          response_intent
        };
        resolve(result);
      })
      .catch(err => {
        // ERROR
      });
  });
}

function readResponseBody(api: Api, body: any) {
  switch (api) {
    case Api.Luis:
      return getResponseIntentLuis(body);
    case Api.Wit:
      return getResponseIntentWit(body);
    case Api.Geneea:
      return getResponseIntentGeneea(body);
    case Api.Alquist:
      return getResponseIntentAlquist(body);
    default:
      console.error("api " + api.toString() + " is unrecognized!");
      return "None";
  }
}

function sendRequest(
  api: Api,
  endpointUrl: string,
  intentData: TestDataIntent
) {
  return new Promise<any>((resolve, reject) => {
    const options = getReqOptions(api, endpointUrl, intentData);
    req(api, options, (error, response, body) => {
      if (error) {
        console.error(error);
        reject(error);
      } else if (response.statusCode !== 200 || !body) {
        reject(
          "Intent query: Something went wrong on the server side on sentence: " +
            intentData.sentence +
            "\n" +
            util.inspect(response.body)
        );
      } else {
        console.log("sent: ", util.inspect(options, false, null, true));
        console.log("received: ", util.inspect(body, false, null, true));
        try {
          const b = JSON.parse(body);
          b.elapsedTime = response.elapsedTime;
          resolve(b);
        } catch (err) {
          console.error(err);
          reject(err);
        }
      }
    });
  });
}

function getReqOptions(
  api: Api,
  endpointUrl: string,
  intentData: TestDataIntent
) {
  var options: request.UrlOptions & request.CoreOptions = {
    url: endpointUrl,
    time: true,
    headers: {}
  };

  if (api === Api.Alquist) {
    options.formData = {
      query: intentData.sentence
    };
  } else {
    options.url += encodeURI(intentData.sentence);
  }

  if (api === Api.Wit) {
    options.headers = {
      Authorization: "Bearer 2SYKV32KY2IAYMXXDDP6SPS6RLZOMGWC"
    };
  }
  if (api === Api.Geneea) {
    options.headers = {
      Authorization: "Basic ZmVlZHlvdTpLZm5jdDhsaEFE"
    };
  }

  return options;
}

function req(
  api: Api,
  options: request.UrlOptions & request.CoreOptions,
  cb: request.RequestCallback
) {
  if (api === Api.Alquist) {
    request.post(options, cb);
  } else {
    request.get(options, cb);
  }
}

function getResponseIntentGeneea(response: GeneeaResponse): string {
  if (
    response &&
    response.mainIntent &&
    response.mainIntent.name &&
    response.mainIntent.name != "Unknown"
  ) {
    return response.mainIntent.name;
  } else {
    return "None";
  }
}

function getResponseIntentAlquist(response: AlquistResponse[]): string {
  if (response && response.length > 0 && response[0].answer) {
    return response[0].answer;
  } else {
    return "None";
  }
}

function getResponseIntentLuis(response: LuisResponse): string {
  if (
    response &&
    response.topScoringIntent &&
    response.topScoringIntent.intent
  ) {
    return response.topScoringIntent.intent;
  } else {
    return "None";
  }
}

function getResponseIntentWit(response: WitResponse): string {
  if (
    response &&
    response.entities &&
    response.entities.intent &&
    response.entities.intent[0].value
  ) {
    return response.entities.intent[0].value;
  } else {
    return "None";
  }
}
