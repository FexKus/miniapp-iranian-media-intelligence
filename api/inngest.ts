import { serve } from "inngest/edge";
import { inngest } from "../inngest/client";
import { analyzeReport } from "../inngest/functions/analyzeReport";

export const config = {
  runtime: "nodejs",
};

export default serve({
  client: inngest,
  functions: [analyzeReport],
});
