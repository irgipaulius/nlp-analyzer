"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = __importDefault(require("chalk"));
var util_1 = __importDefault(require("util"));
var request_1 = __importDefault(require("request"));
var _1 = require("./");
var types_1 = require("./types");
function IntentRecognitionTest(api, testData) {
    return new Promise(function (resolve, reject) {
        if (testData.IntentTesting) {
            var endpointUrl_1 = _1.getEndpointUrl(api);
            if (endpointUrl_1) {
                var testSuite = testData.IntentTesting.map(function (intentTest) { return IntentQuery(api, intentTest, endpointUrl_1); });
                Promise.all(testSuite)
                    .then(function (results) {
                    // when all intent tests are completed.
                    var all = new Set(results);
                    // count correctly and incorrectly annotated text
                    var allTrue = new Set(results.filter(function (x) { return x.defined_intent === x.response_intent; }));
                    var allFalse = new Set(results.filter(function (x) { return !allTrue.has(x); }));
                    //negatives - text which shouldn't be annotated
                    var allNegatives = new Set(results.filter(function (x) { return "None" === x.defined_intent; }));
                    //positives - text which should be annotated
                    var allPositives = new Set(results.filter(function (x) { return "None" !== x.defined_intent; }));
                    // true negatives - correct if text wasn't annotated , None - None
                    var allTrueNegatives = new Set(Array.from(allNegatives).filter(function (x) { return allTrue.has(x); }));
                    // false negatives - incorrect if text was annotated , None - robot
                    var allFalseNegatives = new Set(Array.from(allNegatives).filter(function (x) { return allFalse.has(x); }));
                    // true positives - correct if text was annotated , robot - robot
                    var allTruePositives = new Set(Array.from(allPositives).filter(function (x) { return allTrue.has(x); }));
                    // false negatives - incorrect if text wasn't annotated , robot - None
                    var allFalsePositives = new Set(Array.from(allPositives).filter(function (x) { return allFalse.has(x); }));
                    // count how many of the answered had a typo
                    var typoed = results.filter(function (x) { return x.test_data.typo; });
                    var typoedCorrect = new Set(typoed.filter(function (x) { return allTrue.has(x); }));
                    var typoedIncorrect = new Set(typoed.filter(function (x) { return allFalse.has(x); }));
                    // collect delta_time from each query
                    var timings = results.map(function (x) { return x.delta_time; });
                    // do some more complicated calculations
                    var precision = _1.calculatePrecision(allTruePositives.size, allFalsePositives.size);
                    var recall = _1.calculateRecall(allTruePositives.size, allFalseNegatives.size);
                    var mean = _1.calculateMean(precision, recall);
                    var result = {
                        api: types_1.Api[api],
                        average_time: _1.calculateAverage(timings),
                        minimum_time: Math.min.apply(Math, timings),
                        maximum_time: Math.max.apply(Math, timings),
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
                        ratio_falsenegatives: _1.calculateRatio(allFalseNegatives.size, all.size),
                        ratio_falsepositives: _1.calculateRatio(allFalsePositives.size, all.size),
                        ratio_truenegatives: _1.calculateRatio(allTrueNegatives.size, all.size),
                        ratio_truepositives: _1.calculateRatio(allTruePositives.size, all.size),
                        precision: precision,
                        recall: recall,
                        mean: mean
                    };
                    resolve(result);
                })
                    .catch(function (err) {
                    console.log("Error in one of the Intent test requests");
                    reject(err);
                });
            }
            else {
                reject("no endpoint url defined for " + types_1.Api[api]);
            }
        }
        else {
            var msg = "Intent Test Deactivated, because testing data is not provided";
            console.log(chalk_1.default.yellow(msg));
            resolve(undefined);
        }
    });
}
exports.IntentRecognitionTest = IntentRecognitionTest;
function IntentQuery(api, intentTestData, endpointUrl) {
    return new Promise(function (resolve, reject) {
        // set up intent test
        sendRequest(api, endpointUrl, intentTestData)
            .then(function (body) {
            //successful request
            var response_intent = readResponseBody(api, body);
            var result = {
                query: intentTestData.sentence,
                delta_time: (body && body.elapsedTime) || 0,
                test_data: intentTestData,
                defined_intent: intentTestData.intent,
                response_intent: response_intent
            };
            resolve(result);
        })
            .catch(function (err) {
            // ERROR
        });
    });
}
function readResponseBody(api, body) {
    switch (api) {
        case types_1.Api.Luis:
            return getResponseIntentLuis(body);
        case types_1.Api.Wit:
            return getResponseIntentWit(body);
        case types_1.Api.Geneea:
            return getResponseIntentGeneea(body);
        case types_1.Api.Alquist:
            return getResponseIntentAlquist(body);
        default:
            console.error("api " + api.toString() + " is unrecognized!");
            return "None";
    }
}
function sendRequest(api, endpointUrl, intentData) {
    return new Promise(function (resolve, reject) {
        var options = getReqOptions(api, endpointUrl, intentData);
        req(api, options, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else if (response.statusCode !== 200 || !body) {
                reject("Intent query: Something went wrong on the server side on sentence: " +
                    intentData.sentence +
                    "\n" +
                    util_1.default.inspect(response.body));
            }
            else {
                console.log("sent: ", util_1.default.inspect(options, false, null, true));
                console.log("received: ", util_1.default.inspect(body, false, null, true));
                try {
                    var b = JSON.parse(body);
                    b.elapsedTime = response.elapsedTime;
                    resolve(b);
                }
                catch (err) {
                    console.error(err);
                    reject(err);
                }
            }
        });
    });
}
function getReqOptions(api, endpointUrl, intentData) {
    var options = {
        url: endpointUrl,
        time: true,
        headers: {}
    };
    if (api === types_1.Api.Alquist) {
        options.formData = {
            query: intentData.sentence
        };
    }
    else {
        options.url += encodeURI(intentData.sentence);
    }
    if (api === types_1.Api.Wit) {
        options.headers = {
            Authorization: "Bearer 2SYKV32KY2IAYMXXDDP6SPS6RLZOMGWC"
        };
    }
    if (api === types_1.Api.Geneea) {
        options.headers = {
            Authorization: "Basic ZmVlZHlvdTpLZm5jdDhsaEFE"
        };
    }
    return options;
}
function req(api, options, cb) {
    if (api === types_1.Api.Alquist) {
        request_1.default.post(options, cb);
    }
    else {
        request_1.default.get(options, cb);
    }
}
function getResponseIntentGeneea(response) {
    if (response &&
        response.mainIntent &&
        response.mainIntent.name &&
        response.mainIntent.name != "Unknown") {
        return response.mainIntent.name;
    }
    else {
        return "None";
    }
}
function getResponseIntentAlquist(response) {
    if (response && response.length > 0 && response[0].answer) {
        return response[0].answer;
    }
    else {
        return "None";
    }
}
function getResponseIntentLuis(response) {
    if (response &&
        response.topScoringIntent &&
        response.topScoringIntent.intent) {
        return response.topScoringIntent.intent;
    }
    else {
        return "None";
    }
}
function getResponseIntentWit(response) {
    if (response &&
        response.entities &&
        response.entities.intent &&
        response.entities.intent[0].value) {
        return response.entities.intent[0].value;
    }
    else {
        return "None";
    }
}
