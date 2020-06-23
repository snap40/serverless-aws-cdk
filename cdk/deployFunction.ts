import { AwsCdkDeploy } from "../deploy";
import { Mode, ToolkitInfo } from "aws-cdk";
import { Lambda } from "aws-sdk";
import { getToolkitInfo } from "./toolkitStack";

import * as fs from "fs";

export async function validateArgs(this: AwsCdkDeploy) {
  this.serverless.cli.log("validateArgs()");

  const updateConfig = this.provider.options["update-config"];
  if (!!updateConfig) {
    throw new Error(
      "update-config option is specified but isn't currently supported"
    );
  }

  this.serverless = this.provider.serverless;
  const functionNames: string[] = this.serverless.service.getAllFunctions();
  const functionName = this.provider.options.function;
  if (!functionNames.includes(functionName)) {
    throw new Error(`${functionName} is not a valid function name!`);
  }

  this.provider.options.functionObj = this.serverless.service.getFunction(
    this.provider.options.function
  );

  this.serverless.cli.log("validateArgs() finished");
}

export async function deployFunction(this: AwsCdkDeploy) {
  const functionName = this.provider.options.function;

  const canonicalFunctionName = this.provider.canonicalise(functionName);
  const cfn = (await this.provider.getSdk()).cloudFormation();
  const stackName = this.provider.getStackName();
  const result = await cfn
    .describeStacks({
      StackName: stackName
    })
    .promise();
  const lambdaArnOutputKey = this.provider.makeAlphanumeric(
    `${canonicalFunctionName}Arn`
  );

  if (!result.Stacks?.length) {
    throw new Error(
      `Failed to retrieve details of stack ${stackName}; does it exist?`
    );
  }

  const arn = result.Stacks[0]?.Outputs?.find(
    output => output.OutputKey == lambdaArnOutputKey
  )?.OutputValue;

  if (!arn) {
    throw new Error(
      `Failed to update function ${functionName}; it needs to have previously been fully deployed`
    );
  }

  const clientConfig: Lambda.Types.ClientConfiguration = {
    region: this.provider.getRegion()
  };

  const functionZipPath = this.provider.getFunctionZipPath(functionName);
  const functionZipContents = fs.readFileSync(functionZipPath);

  const toolkitInfo: ToolkitInfo = await getToolkitInfo.bind(this)();
  const key = `function-deploys/${canonicalFunctionName}/${canonicalFunctionName}-${new Date().toISOString()}.zip`;
  const s3 = (await this.provider.getSdk()).s3();
  this.serverless.cli.log(
    `Uploading updated ${functionName} code to s3://${toolkitInfo.bucketName}/${key}...`
  );
  s3.putObject({
    Bucket: toolkitInfo.bucketName,
    Body: functionZipContents,
    Key: key
  });

  this.serverless.cli.log(`Updating ${functionName} definition...`);
  const lambdaClient = new Lambda(clientConfig);
  lambdaClient.updateFunctionCode({
    FunctionName: arn,
    S3Bucket: toolkitInfo.bucketName,
    S3Key: key
  });
}
