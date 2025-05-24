import express from "express";
import modelRouter from "./routes/model";
import licenseRouter from "./routes/license";
import fineTuneRouter from "./routes/fineTune";

const app = express();
app.use(express.json());

app.use("/", modelRouter);
app.use("/", licenseRouter);
app.use("/", fineTuneRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Internal API server listening on port ${PORT}`);
});
