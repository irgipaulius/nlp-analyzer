import {
  calculateAverage,
  calculateRatio,
  getEndpointUrl,
  calculatePrecision,
  calculateRecall,
  calculateMean
} from "./";

import request from "request";
import chalk from "chalk";
import {
  SentimentTestResults,
  SentimentTest,
  Api,
  TestData,
  TestDataSentiment,
  LuisResponse,
  WitResponse
} from "./types";

export function SentimentAnalysisTest(
  api: Api,
  testData: TestData
): Promise<SentimentTestResults> {
  return new Promise<SentimentTestResults>((resolve, reject) => {
    if (testData.SentimentTesting) {
      const endpointUrl = getEndpointUrl(api);
      if (endpointUrl) {
        let testSuite: Array<
          Promise<SentimentTest>
        > = testData.SentimentTesting.map(sentimentTest =>
          SentimentQuery(api, sentimentTest, endpointUrl)
        );
        Promise.all(testSuite)
          .then(results => {
            //when all sentiment queries are completed

            let all = new Set(results);

            // negative - if correct answer was 'neutral'
            let allNegatives = new Set(
              results.filter(x => "neutral" === x.defined_sentiment)
            );
            // positive - if correct answer is 'positive' or 'negative'
            let allPositives = new Set(
              results.filter(x => !allNegatives.has(x))
            );

            // all correctly guessed
            let allTrue = new Set(
              results.filter(x => x.defined_sentiment === x.response_sentiment)
            );
            // all incorrectly guessed
            let allFalse = new Set(results.filter(x => !allTrue.has(x)));

            // true positive - if positive/negative text was analized as positive/negative correctly
            let allTruePositives = new Set(
              Array.from(allPositives).filter(x => allTrue.has(x))
            );
            // true negative - if neutral text was analized as 'neutral'
            let allTrueNegatives = new Set(
              Array.from(allNegatives).filter(x => allTrue.has(x))
            );
            // false positive - if positive/negative text was analized as pos/neg/neu incorrectly
            let allFalsePositives = new Set(
              Array.from(allPositives).filter(x => allFalse.has(x))
            );
            // false negative - if neutral text was analized as positive/negative
            let allFalseNegatives = new Set(
              Array.from(allNegatives).filter(x => allFalse.has(x))
            );

            // count how many of the answered had a typo
            let typoed = results.filter(x => x.test_data.typo);
            let typoedCorrect = new Set(typoed.filter(x => allTrue.has(x)));
            let typoedIncorrect = new Set(typoed.filter(x => allFalse.has(x)));

            // some math
            let precision = calculatePrecision(
              allTruePositives.size,
              allFalsePositives.size
            );
            let recall = calculateRecall(
              allTruePositives.size,
              allFalseNegatives.size
            );
            let mean = calculateMean(precision, recall);

            // collect delta_time from each query
            let timings = results.map(x => x.delta_time);

            let result: SentimentTestResults = {
              api: Api[api],

              average_time: calculateAverage(timings),
              minimum_time: Math.min(...timings),
              maximum_time: Math.max(...timings),

              number_tests: results.length,
              number_failed: allFalse.size,
              number_correct: allTrue.size,

              number_typoed: typoed.length,
              number_correct_typoed: typoedCorrect.size,
              number_failed_typoed: typoedIncorrect.size,

              number_falsenegatives: allFalseNegatives.size,
              number_falsepositives: allFalsePositives.size,
              number_truenegatives: allTrueNegatives.size,
              number_truepositives: allTruePositives.size,

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
              mean,

              correct: Array.from(allTrue),
              failed: Array.from(allFalse)
            };
            resolve(result);
          })
          .catch(e => {
            console.log("Error in one of the Sentiment test requests");
            reject(e);
          });
      } else {
        reject("no endpoint url defined for " + Api[api]);
      }
    } else {
      const msg =
        "Sentiment Test Diactivated, because testing data is not provided";
      console.log(chalk.yellow(msg));
      resolve(undefined);
    }
  });
}

function SentimentQuery(
  api: Api,
  sentimentTestData: TestDataSentiment,
  endpointUrl: string
): Promise<SentimentTest> {
  return new Promise<SentimentTest>((resolve, reject) => {
    // set up sentiment test
    var options = {
      url: endpointUrl + sentimentTestData.sentence,
      time: true,
      headers: {}
    };

    if (api === Api.Wit) {
      options.headers = {
        Authorization: "Bearer " + "2SYKV32KY2IAYMXXDDP6SPS6RLZOMGWC"
      };
    }
    request.get(options, (error: Error, response, body) => {
      if (error) {
        console.error(error);
        reject(error);
      } else if (response.statusCode !== 200 || !body) {
        reject(
          "Sentiment query: Something went wrong on the server side on sentence: " +
            sentimentTestData.sentence
        );
      } else {
        //successful request
        body = body && JSON.parse(body);
        let response_sentiment: string;
        if (api === Api.Luis) {
          const luisResponse: LuisResponse = body;
          response_sentiment = getResponseSentimentLuis(luisResponse);
        } else if (api === Api.Wit) {
          const witResponse: WitResponse = body;
          response_sentiment = getResponseSentimentWit(witResponse);
        } else {
          // if not luis
          reject("api is undefined");
        }
        let result: SentimentTest = {
          query: sentimentTestData.sentence,
          delta_time: response.elapsedTime || 0,
          defined_sentiment: sentimentTestData.sentiment,
          response_sentiment,
          test_data: sentimentTestData
        };
        resolve(result);
      }
    });
  });
}
function getResponseSentimentLuis(luisResponse: LuisResponse): string {
  if (
    luisResponse &&
    luisResponse.sentimentAnalysis &&
    luisResponse.sentimentAnalysis.label
  ) {
    return luisResponse.sentimentAnalysis.label.toLowerCase();
  } else {
    return "neutral";
  }
}

function getResponseSentimentWit(witResponse: WitResponse): string {
  if (
    witResponse &&
    witResponse.entities &&
    witResponse.entities.sentiment &&
    witResponse.entities.sentiment[0].value
  ) {
    return witResponse.entities.sentiment[0].value.toLowerCase();
  } else {
    return "neutral";
  }
}
