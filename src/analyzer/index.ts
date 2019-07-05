import express from "express";
import { Express } from "express";
import chalk from "chalk";
import bodyParser from "body-parser";
import path from "path";
import util from "util";
import fs from "fs";

import { IntentRecognitionTest } from "./intentTesting";
import { SentimentAnalysisTest } from "./sentimentTesting";
import { Input, Results, Api, TestData } from "./types";

//2b059e9b30274b7e9f8c26380fb032aa bing spell checker
const luisEndpointUrl =
  "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/5f8c5bc7-6028-4bd0-ba17-bb6f8f8417fe?spellCheck=true&bing-spell-check-subscription-key=%7BYOUR_BING_KEY_HERE%7D&verbose=true&timezoneOffset=-360&subscription-key=46e0dc91975344fba8c57777175fb7f7&q=";
const watsonEndpointUrl =
  "https://dialogflow.googleapis.com/v2/projects/test1-e2c30/agent/sessions/9d837695-f397-f9cc-9a20-ef3adc27c18b:detectIntent";
const witEndpointUrl = "https://api.wit.ai/message?v=20181121&q=";
const geneeaEndpointUrl =
  "https://intent.geneea.com/models/feedyou-hr/intent?text=";
const alquistEndpointUrl = "http://alquist.ciirc.cvut.cz:8081/query?n=1";

let endpointUrl = "";

export function startServer(port = 3000): Express {
  const app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.listen(port, () =>
    console.log(chalk.magenta.bold(`EXPRESS LISTENING ON PORT :${port}...`))
  );

  return app;
}

export function analize(data: Input): Promise<Results> {
  return new Promise<Results>((resolve, reject) => {
    endpointUrl = data.uri;
    getData(data, (error, testData) => {
      if (error || !testData) {
        reject(
          "Failed parsing input data. Go back and check for errors: " + error
        );
      } else {
        Promise.all([
          IntentRecognitionTest(<Api>parseInt(Api[<any>data.api]), testData),
          SentimentAnalysisTest(<Api>parseInt(Api[<any>data.api]), testData)
        ])
          .then(results => {
            let intent = results[0];
            let sentiment = results[1];

            if (intent) {
              console.log(
                chalk.magentaBright.bold(
                  "\n\n\tITENT CLASSIFICATION TESTING RESULTS:"
                )
              );
              console.log(
                chalk.bgWhite.black("TRUTHY\n"),
                "(" +
                  intent.number_correct +
                  " out of " +
                  intent.number_tests +
                  "):\n",
                chalk.greenBright(
                  util.inspect(intent.correct, false, null, true)
                )
              );
              console.log(
                chalk.bgRedBright.black("FALSY\n"),
                "(" +
                  intent.number_failed +
                  " out of " +
                  intent.number_tests +
                  "):\n",
                chalk.redBright(util.inspect(intent.failed, false, null, true))
              );
              console.log(
                chalk.bgCyanBright.black(
                  " \nMathmatics:\n \nPrecision: " +
                    chalk.red(intent.precision.toString()) +
                    "\nRecall: " +
                    chalk.red(intent.recall.toString()) +
                    "\nMean: " +
                    chalk.red(intent.mean.toString()) +
                    "\n "
                )
              );
            }

            if (sentiment) {
              console.log(
                chalk.magentaBright.bold(
                  "\n\n\tSENTIMENT ANALYSIS TESTING RESULTS:"
                )
              );
              console.log(
                chalk.bgWhite.black("CORRECTLY ANALYZED:\n"),
                "(" +
                  sentiment.correct.length +
                  " out of " +
                  sentiment.number_tests +
                  "):",
                util.inspect(sentiment.correct, false, null, true)
              );
              console.log(
                chalk.bgRedBright.black("INCORRECTLY ANALYZED:\n"),
                chalk.redBright(
                  util.inspect(sentiment.failed, false, null, true)
                )
              );
              console.log(
                chalk.bgCyanBright.black(
                  " \nMathmatics:\n \nPrecision: " +
                    chalk.red(sentiment.precision.toString()) +
                    "\nRecall: " +
                    chalk.red(sentiment.recall.toString()) +
                    "\nMean: " +
                    chalk.red(sentiment.mean.toString()) +
                    "\n "
                )
              );
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
              intent,
              sentiment
            });
          })
          .catch(err => {
            reject(err);
          });
      }
    });
  });
}

function getData(
  data: Input,
  callback: (error: Error, data?: TestData) => void
) {
  if (!data.useData) {
    try {
      callback(
        undefined,
        JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "../", "../", "resources", "testData.json"),
            "utf8"
          )
        )
      );
    } catch (e) {
      console.error(e);
      callback(e);
    }
  } else {
    try {
      let obj: TestData = JSON.parse(data.data);
      if (
        (obj.IntentTesting &&
          obj.IntentTesting.length > 0 &&
          obj.IntentTesting[0].sentence &&
          obj.IntentTesting[0].intent) ||
        (obj.SentimentTesting &&
          obj.SentimentTesting.length > 0 &&
          obj.SentimentTesting[0].sentence &&
          obj.SentimentTesting[0].sentiment)
      )
        callback(undefined, obj);
      else throw new Error("Testing Data has bad format.");
    } catch (e) {
      console.error(e);
      callback(e);
    }
  }
}

export function calculateAverage(numberrArray: Array<number>) {
  return numberrArray.reduce((a, b) => a + b, 0) / numberrArray.length;
}

export function calculateRatio(correct: number, total: number) {
  if (total) return correct / total;
  else return 0;
}

export function calculatePrecision(TP: number, FP: number): number {
  if (TP + FP === 0) return 0;
  else return TP / (TP + FP);
}

export function calculateRecall(TP: number, FN: number): number {
  if (TP + FN === 0) return 0;
  else return TP / (TP + FN);
}

export function calculateMean(Precision: number, Recall: number): number {
  if (Precision + Recall === 0) return 0;
  else return (2 * Precision * Recall) / (Precision + Recall);
}

export function getEndpointUrl(x: Api): string {
  if (endpointUrl) return endpointUrl;
  else {
    switch (x) {
      case Api.Luis:
        return luisEndpointUrl;
      case Api.Wit:
        return witEndpointUrl;
      case Api.Watson:
        return watsonEndpointUrl;
      case Api.Geneea:
        return geneeaEndpointUrl;
      case Api.Alquist:
        return alquistEndpointUrl;
      default:
        return "";
    }
  }
}
