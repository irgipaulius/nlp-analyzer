"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var analyzer = __importStar(require("./analyzer"));
var chalk_1 = __importDefault(require("chalk"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var app = analyzer.startServer();
// loading input form
app.get("/", function (req, res) {
    res.sendFile(path_1.default.join(__dirname, "../", "inputForm.html"));
});
// receiving input from input form
app.post("/", function (req, res) {
    if (req.body.api) {
        // redirect input to /result page
        res.redirect(307, "/result");
    }
    else {
        console.error("no api input found");
    }
});
// displaying results
app.post("/result", function (req, res) {
    console.log(chalk_1.default.yellow("Input received: " + JSON.stringify(req.body, undefined, " ")));
    var input = {
        uri: req.body.input,
        useData: req.body.useData,
        data: req.body.data,
        api: req.body.api
    };
    var outputForm = fs_1.default.readFileSync(path_1.default.join(__dirname, "../", "outputForm.html"));
    analyzer
        .analize(input)
        .then(function (analysis) {
        if (outputForm) {
            var result = outputForm.toString();
            try {
                if (analysis.intent)
                    result = result.replace("OutputResult1", Object.keys(analysis.intent)
                        .map(function (key) {
                        var value = typeof analysis.intent[key] === "object"
                            ? JSON.stringify(analysis.intent[key], undefined, "  ")
                            : analysis.intent[key];
                        return key + ":   " + value;
                    })
                        .join("<br>"));
                if (analysis.sentiment)
                    result = result.replace("OutputResult2", Object.keys(analysis.sentiment)
                        .map(function (key) {
                        var value = typeof analysis.sentiment[key] === "object"
                            ? JSON.stringify(analysis.sentiment[key], undefined, "  ")
                            : analysis.sentiment[key];
                        return key + ":   " + value;
                    })
                        .join("<br>"));
            }
            catch (e) {
                res.send("Failed parsing output form");
            }
            res.send(result);
        }
        else
            console.error("Error reading HTML output form");
    })
        .catch(function (err) {
        console.error(err);
        var result = outputForm
            .toString()
            .replace("OutputResult", JSON.stringify(err, undefined, "<br>"))
            .replace("OutputElapsedTime", "");
        res.send(result);
    });
});
