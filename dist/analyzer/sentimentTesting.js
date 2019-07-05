"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require("./");
var request_1 = __importDefault(require("request"));
var chalk_1 = __importDefault(require("chalk"));
var types_1 = require("./types");
function SentimentAnalysisTest(api, testData) {
    return new Promise(function (resolve, reject) {
        if (testData.SentimentTesting) {
            var endpointUrl_1 = _1.getEndpointUrl(api);
            if (endpointUrl_1) {
                var testSuite = testData.SentimentTesting.map(function (sentimentTest) {
                    return SentimentQuery(api, sentimentTest, endpointUrl_1);
                });
                Promise.all(testSuite)
                    .then(function (results) {
                    //when all sentiment queries are completed
                    var all = new Set(results);
                    // negative - if correct answer was 'neutral'
                    var allNegatives = new Set(results.filter(function (x) { return "neutral" === x.defined_sentiment; }));
                    // positive - if correct answer is 'positive' or 'negative'
                    var allPositives = new Set(results.filter(function (x) { return !allNegatives.has(x); }));
                    // all correctly guessed
                    var allTrue = new Set(results.filter(function (x) { return x.defined_sentiment === x.response_sentiment; }));
                    // all incorrectly guessed
                    var allFalse = new Set(results.filter(function (x) { return !allTrue.has(x); }));
                    // true positive - if positive/negative text was analized as positive/negative correctly
                    var allTruePositives = new Set(Array.from(allPositives).filter(function (x) { return allTrue.has(x); }));
                    // true negative - if neutral text was analized as 'neutral'
                    var allTrueNegatives = new Set(Array.from(allNegatives).filter(function (x) { return allTrue.has(x); }));
                    // false positive - if positive/negative text was analized as pos/neg/neu incorrectly
                    var allFalsePositives = new Set(Array.from(allPositives).filter(function (x) { return allFalse.has(x); }));
                    // false negative - if neutral text was analized as positive/negative
                    var allFalseNegatives = new Set(Array.from(allNegatives).filter(function (x) { return allFalse.has(x); }));
                    // count how many of the answered had a typo
                    var typoed = results.filter(function (x) { return x.test_data.typo; });
                    var typoedCorrect = new Set(typoed.filter(function (x) { return allTrue.has(x); }));
                    var typoedIncorrect = new Set(typoed.filter(function (x) { return allFalse.has(x); }));
                    // some math
                    var precision = _1.calculatePrecision(allTruePositives.size, allFalsePositives.size);
                    var recall = _1.calculateRecall(allTruePositives.size, allFalseNegatives.size);
                    var mean = _1.calculateMean(precision, recall);
                    // collect delta_time from each query
                    var timings = results.map(function (x) { return x.delta_time; });
                    var result = {
                        api: types_1.Api[api],
                        average_time: _1.calculateAverage(timings),
                        minimum_time: Math.min.apply(Math, timings),
                        maximum_time: Math.max.apply(Math, timings),
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
                        ratio_falsenegatives: _1.calculateRatio(allFalseNegatives.size, all.size),
                        ratio_falsepositives: _1.calculateRatio(allFalsePositives.size, all.size),
                        ratio_truenegatives: _1.calculateRatio(allTrueNegatives.size, all.size),
                        ratio_truepositives: _1.calculateRatio(allTruePositives.size, all.size),
                        precision: precision,
                        recall: recall,
                        mean: mean,
                        correct: Array.from(allTrue),
                        failed: Array.from(allFalse)
                    };
                    resolve(result);
                })
                    .catch(function (e) {
                    console.log("Error in one of the Sentiment test requests");
                    reject(e);
                });
            }
            else {
                reject("no endpoint url defined for " + types_1.Api[api]);
            }
        }
        else {
            var msg = "Sentiment Test Diactivated, because testing data is not provided";
            console.log(chalk_1.default.yellow(msg));
            resolve(undefined);
        }
    });
}
exports.SentimentAnalysisTest = SentimentAnalysisTest;
function SentimentQuery(api, sentimentTestData, endpointUrl) {
    return new Promise(function (resolve, reject) {
        // set up sentiment test
        var options = {
            url: endpointUrl + sentimentTestData.sentence,
            time: true,
            headers: {}
        };
        if (api === types_1.Api.Wit) {
            options.headers = {
                Authorization: "Bearer " + "2SYKV32KY2IAYMXXDDP6SPS6RLZOMGWC"
            };
        }
        request_1.default.get(options, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else if (response.statusCode !== 200 || !body) {
                reject("Sentiment query: Something went wrong on the server side on sentence: " +
                    sentimentTestData.sentence);
            }
            else {
                //successful request
                body = body && JSON.parse(body);
                var response_sentiment = void 0;
                if (api === types_1.Api.Luis) {
                    var luisResponse = body;
                    response_sentiment = getResponseSentimentLuis(luisResponse);
                }
                else if (api === types_1.Api.Wit) {
                    var witResponse = body;
                    response_sentiment = getResponseSentimentWit(witResponse);
                }
                else {
                    // if not luis
                    reject("api is undefined");
                }
                var result = {
                    query: sentimentTestData.sentence,
                    delta_time: response.elapsedTime || 0,
                    defined_sentiment: sentimentTestData.sentiment,
                    response_sentiment: response_sentiment,
                    test_data: sentimentTestData
                };
                resolve(result);
            }
        });
    });
}
function getResponseSentimentLuis(luisResponse) {
    if (luisResponse &&
        luisResponse.sentimentAnalysis &&
        luisResponse.sentimentAnalysis.label) {
        return luisResponse.sentimentAnalysis.label.toLowerCase();
    }
    else {
        return "neutral";
    }
}
function getResponseSentimentWit(witResponse) {
    if (witResponse &&
        witResponse.entities &&
        witResponse.entities.sentiment &&
        witResponse.entities.sentiment[0].value) {
        return witResponse.entities.sentiment[0].value.toLowerCase();
    }
    else {
        return "neutral";
    }
}
