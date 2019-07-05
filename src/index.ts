import * as analyzer from "./analyzer";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { Input } from "./analyzer/types";

const app = analyzer.startServer();

// loading input form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../", "inputForm.html"));
});

// receiving input from input form
app.post("/", (req, res) => {
  if (req.body.api) {
    // redirect input to /result page
    res.redirect(307, "/result");
  } else {
    console.error("no api input found");
  }
});

// displaying results
app.post("/result", (req, res) => {
  console.log(
    chalk.yellow("Input received: " + JSON.stringify(req.body, undefined, " "))
  );
  const input: Input = {
    uri: req.body.input,
    useData: req.body.useData,
    data: req.body.data,
    api: req.body.api
  };
  let outputForm = fs.readFileSync(
    path.join(__dirname, "../", "outputForm.html")
  );
  analyzer
    .analize(input)
    .then(analysis => {
      if (outputForm) {
        let result = outputForm.toString();
        try {
          if (analysis.intent)
            result = result.replace(
              "OutputResult1",
              Object.keys(analysis.intent)
                .map(key => {
                  let value =
                    typeof analysis.intent[key] === "object"
                      ? JSON.stringify(analysis.intent[key], undefined, "  ")
                      : analysis.intent[key];
                  return key + ":   " + value;
                })
                .join("<br>")
            );

          if (analysis.sentiment)
            result = result.replace(
              "OutputResult2",
              Object.keys(analysis.sentiment)
                .map(key => {
                  let value =
                    typeof analysis.sentiment[key] === "object"
                      ? JSON.stringify(analysis.sentiment[key], undefined, "  ")
                      : analysis.sentiment[key];
                  return key + ":   " + value;
                })
                .join("<br>")
            );
        } catch (e) {
          res.send("Failed parsing output form");
        }
        res.send(result);
      } else console.error("Error reading HTML output form");
    })
    .catch(err => {
      console.error(err);
      const result = outputForm
        .toString()
        .replace("OutputResult", JSON.stringify(err, undefined, "<br>"))
        .replace("OutputElapsedTime", "");
      res.send(result);
    });
});
