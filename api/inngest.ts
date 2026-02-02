import { serve } from "inngest/next";
import { inngest } from "../inngest/client.js";
import { analyzeReport } from "../inngest/functions/analyzeReport.js";

export default serve({
  client: inngest,
  functions: [analyzeReport],
});
