import { serve } from "inngest/edge";
import { inngest } from "../inngest/client.js";
import { analyzeReport } from "../inngest/functions/analyzeReport.js";

export const config = {
  runtime: "nodejs",
};

export default serve({
  client: inngest,
  functions: [analyzeReport],
});
