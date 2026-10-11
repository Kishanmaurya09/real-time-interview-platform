
const { Worker } = require("bullmq");
const axios = require("axios");
require("dotenv").config();

const LANGUAGE_CONFIG = require("./config/languageConfig");

const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  tls: {},
};

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

async function runCodeViaPiston(code, language, input = "") {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    return {
      success: false,
      output: `Unsupported language: ${language}`,
    };
  }

  try {
    const res = await axios.post(
      PISTON_URL,
      {
        language: config.language,
        version: config.version,
        files: [
          {
            name: config.filename,
            content: code,
          },
        ],
        stdin: input,
      },
      {
        timeout: 20000,
      }
    );

    const { compile, run } = res.data;

    // C, C++ aur Java compilation errors
    if (compile && compile.stderr) {
      return {
        success: false,
        output: compile.stderr,
      };
    }

    if (compile && compile.code !== 0) {
      return {
        success: false,
        output: compile.stderr || "Compilation failed",
      };
    }

    if (!run) {
      return {
        success: false,
        output: "Execution result was not returned by Piston",
      };
    }

    if (run.signal === "SIGKILL" || run.code === null) {
      return {
        success: false,
        output: "Execution timed out or was killed",
      };
    }

    if (run.code !== 0) {
      return {
        success: false,
        output: run.stderr || `Program exited with code ${run.code}`,
      };
    }

    if (run.stderr) {
      return {
        success: false,
        output: run.stderr,
      };
    }

    return {
      success: true,
      output: run.stdout || "",
    };
  } catch (err) {
    const message = err.response
      ? `Piston API error (${err.response.status}): ${
          JSON.stringify(err.response.data)
        }`
      : err.code === "ECONNABORTED"
        ? "Code execution request timed out"
        : err.message;

    console.error("Code execution failed:", message);

    return {
      success: false,
      output: `Execution error: ${message}`,
    };
  }
}

const worker = new Worker(
  "code-execution",
  async (job) => {
    console.log("Worker picked up job:", job.id);

    const {
      code,
      language = "javascript",
      testCases,
    } = job.data;

    // Normal Run Code request
    if (!testCases || testCases.length === 0) {
      const result = await runCodeViaPiston(code, language);

      return {
        mode: "raw",
        ...result,
      };
    }

    // Run code against problem test cases
    const results = [];

    for (const tc of testCases) {
      const result = await runCodeViaPiston(
        code,
        language,
        tc.input || ""
      );

      const actual = (result.output || "").trim();
      const expected = (tc.expectedOutput || "").trim();

      results.push({
        passed: result.success && actual === expected,
        input: tc.isHidden ? null : tc.input,
        expectedOutput: tc.isHidden ? null : expected,
        actualOutput: tc.isHidden
          ? null
          : result.success
            ? actual
            : result.output,
        isHidden: tc.isHidden,
      });
    }

    return {
      mode: "testcases",
      results,
      passedCount: results.filter((r) => r.passed).length,
      totalCount: results.length,
    };
  },
  { connection }
);

console.log(
  "BullMQ worker is listening for jobs on the code-execution queue"
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("BullMQ worker error:", err.message);
});
