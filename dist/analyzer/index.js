"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var chalk_1 = __importDefault(require("chalk"));
var body_parser_1 = __importDefault(require("body-parser"));
var path_1 = __importDefault(require("path"));
var util_1 = __importDefault(require("util"));
var fs_1 = __importDefault(require("fs"));
var intentTesting_1 = require("./intentTesting");
var sentimentTesting_1 = require("./sentimentTesting");
var types_1 = require("./types");
//2b059e9b30274b7e9f8c26380fb032aa bing spell checker
var luisEndpointUrl = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/5f8c5bc7-6028-4bd0-ba17-bb6f8f8417fe?spellCheck=true&bing-spell-check-subscription-key=%7BYOUR_BING_KEY_HERE%7D&verbose=true&timezoneOffset=-360&subscription-key=46e0dc91975344fba8c57777175fb7f7&q=";
var watsonEndpointUrl = "https://dialogflow.googleapis.com/v2/projects/test1-e2c30/agent/sessions/9d837695-f397-f9cc-9a20-ef3adc27c18b:detectIntent";
var witEndpointUrl = "https://api.wit.ai/message?v=20181121&q=";
var geneeaEndpointUrl = "https://intent.geneea.com/models/feedyou-hr/intent?text=";
var alquistEndpointUrl = "http://alquist.ciirc.cvut.cz:8081/query?n=1";
var endpointUrl = "";
function startServer(port) {
    if (port === void 0) { port = 3000; }
    var app = express_1.default();
    app.use(body_parser_1.default.json());
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.listen(port, function () {
        return console.log(chalk_1.default.magenta.bold("EXPRESS LISTENING ON PORT :" + port + "..."));
    });
    return app;
}
exports.startServer = startServer;
function analize(data) {
    return new Promise(function (resolve, reject) {
        endpointUrl = data.uri;
        getData(data, function (error, testData) {
            if (error || !testData) {
                reject("Failed parsing input data. Go back and check for errors: " + error);
            }
            else {
                Promise.all([
                    intentTesting_1.IntentRecognitionTest(parseInt(types_1.Api[data.api]), testData),
                    sentimentTesting_1.SentimentAnalysisTest(parseInt(types_1.Api[data.api]), testData)
                ])
                    .then(function (results) {
                    var intent = results[0];
                    var sentiment = results[1];
                    if (intent) {
                        console.log(chalk_1.default.magentaBright.bold("\n\n\tITENT CLASSIFICATION TESTING RESULTS:"));
                        console.log(chalk_1.default.bgWhite.black("TRUTHY\n"), "(" +
                            intent.number_correct +
                            " out of " +
                            intent.number_tests +
                            "):\n", chalk_1.default.greenBright(util_1.default.inspect(intent.correct, false, null, true)));
                        console.log(chalk_1.default.bgRedBright.black("FALSY\n"), "(" +
                            intent.number_failed +
                            " out of " +
                            intent.number_tests +
                            "):\n", chalk_1.default.redBright(util_1.default.inspect(intent.failed, false, null, true)));
                        console.log(chalk_1.default.bgCyanBright.black(" \nMathmatics:\n \nPrecision: " +
                            chalk_1.default.red(intent.precision.toString()) +
                            "\nRecall: " +
                            chalk_1.default.red(intent.recall.toString()) +
                            "\nMean: " +
                            chalk_1.default.red(intent.mean.toString()) +
                            "\n "));
                    }
                    if (sentiment) {
                        console.log(chalk_1.default.magentaBright.bold("\n\n\tSENTIMENT ANALYSIS TESTING RESULTS:"));
                        console.log(chalk_1.default.bgWhite.black("CORRECTLY ANALYZED:\n"), "(" +
                            sentiment.correct.length +
                            " out of " +
                            sentiment.number_tests +
                            "):", util_1.default.inspect(sentiment.correct, false, null, true));
                        console.log(chalk_1.default.bgRedBright.black("INCORRECTLY ANALYZED:\n"), chalk_1.default.redBright(util_1.default.inspect(sentiment.failed, false, null, true)));
                        console.log(chalk_1.default.bgCyanBright.black(" \nMathmatics:\n \nPrecision: " +
                            chalk_1.default.red(sentiment.precision.toString()) +
                            "\nRecall: " +
                            chalk_1.default.red(sentiment.recall.toString()) +
                            "\nMean: " +
                            chalk_1.default.red(sentiment.mean.toString()) +
                            "\n "));
                    }
                    if (intent && intent.correct && intent.failed) {
                        delete intent.correct;
                        delete intent.failed;
                    }
                    if (sentiment && sentiment.correct && sentiment.failed) {
                        delete sentiment.failed;
                        delete sentiment.correct;
                    }
                    resolve({
                        intent: intent,
                        sentiment: sentiment
                    });
                })
                    .catch(function (err) {
                    reject(err);
                });
            }
        });
    });
}
exports.analize = analize;
function getData(data, callback) {
    if (!data.useData) {
        try {
            callback(undefined, JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, "../", "../", "resources", "testData.json"), "utf8")));
        }
        catch (e) {
            console.error(e);
            callback(e);
        }
    }
    else {
        try {
            var obj = JSON.parse(data.data);
            if ((obj.IntentTesting &&
                obj.IntentTesting.length > 0 &&
                obj.IntentTesting[0].sentence &&
                obj.IntentTesting[0].intent) ||
                (obj.SentimentTesting &&
                    obj.SentimentTesting.length > 0 &&
                    obj.SentimentTesting[0].sentence &&
                    obj.SentimentTesting[0].sentiment))
                callback(undefined, obj);
            else
                throw new Error("Testing Data has bad format.");
        }
        catch (e) {
            console.error(e);
            callback(e);
        }
    }
}
function calculateAverage(numberrArray) {
    return numberrArray.reduce(function (a, b) { return a + b; }, 0) / numberrArray.length;
}
exports.calculateAverage = calculateAverage;
function calculateRatio(correct, total) {
    if (total)
        return correct / total;
    else
        return 0;
}
exports.calculateRatio = calculateRatio;
function calculatePrecision(TP, FP) {
    if (TP + FP === 0)
        return 0;
    else
        return TP / (TP + FP);
}
exports.calculatePrecision = calculatePrecision;
function calculateRecall(TP, FN) {
    if (TP + FN === 0)
        return 0;
    else
        return TP / (TP + FN);
}
exports.calculateRecall = calculateRecall;
function calculateMean(Precision, Recall) {
    if (Precision + Recall === 0)
        return 0;
    else
        return (2 * Precision * Recall) / (Precision + Recall);
}
exports.calculateMean = calculateMean;
function getEndpointUrl(x) {
    if (endpointUrl)
        return endpointUrl;
    else {
        switch (x) {
            case types_1.Api.Luis:
                return luisEndpointUrl;
            case types_1.Api.Wit:
                return witEndpointUrl;
            case types_1.Api.Watson:
                return watsonEndpointUrl;
            case types_1.Api.Geneea:
                return geneeaEndpointUrl;
            case types_1.Api.Alquist:
                return alquistEndpointUrl;
            default:
                return "";
        }
    }
}
exports.getEndpointUrl = getEndpointUrl;
