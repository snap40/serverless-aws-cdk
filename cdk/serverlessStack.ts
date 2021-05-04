import cdk = require("@aws-cdk/core");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import path = require("path");
import uuid = require("uuid");

import { AwsCdkProvider } from "../provider";

export interface ServerlessStackProps extends cdk.StackProps {
  provider: AwsCdkProvider;
}

export class ServerlessStack extends cdk.Stack {
  provider: AwsCdkProvider;
  serverless: any;

  constructor(scope: cdk.Construct, id: string, props: ServerlessStackProps) {
    super(scope, id, props);

    this.provider = props.provider;
    this.serverless = props.provider.serverless;

    const functionNames: string[] = this.serverless.service.getAllFunctions();

    const cdkFunctions = functionNames
      .map((functionName: string) => {
        const func = this.serverless.service.getFunction(functionName);
        const canonicalFunctionName = props.provider.canonicalise(functionName);

        var functionZipPath = props.provider.getFunctionZipPath(functionName);

        const runtime =
          func.runtime || this.serverless.service.provider.runtime;

        if (!runtime) {
          throw new Error("No Lambda runtime specified!");
        }

        // If we're deleting the stack, we don't get the artifact passed in,
        // so we just have to set it to some dummy value
        let code: lambda.Code;
        if (functionZipPath == "SERVERLESS-AWS-CDK-DUMMY") {
          code = lambda.Code.fromBucket(
            s3.Bucket.fromBucketName(
              this,
              `${uuid.v4()}`,
              "serverless-aws-cdk-dummy-deployment-bucket"
            ),
            "no-such-key"
          );
        } else {
          code = new lambda.AssetCode(functionZipPath);
        }

        const cdkFunction = new lambda.Function(
          this,
          `${canonicalFunctionName}-ServerlessDeployedLambda`,
          {
            code: code,
            handler: func.handler,
            timeout: func.timeout
              ? cdk.Duration.seconds(func.timeout)
              : undefined,
            runtime: lambda.Runtime.ALL.filter(el => el.name === runtime)[0],
            environment: func.environment || {},
            functionName: func.name
          }
        );

        new cdk.CfnOutput(
          this,
          `${canonicalFunctionName}-ServerlessDeployedLambda-arn`,
          { value: cdkFunction.functionArn }
        ).overrideLogicalId(
          this.provider.makeAlphanumeric(`${canonicalFunctionName}Arn`)
        );

        const result: { [name: string]: lambda.Function } = {
          [functionName]: cdkFunction
        };
        return result;
      })
      .reduce((obj, current) => ({ ...obj, ...current }));

    const cdkModulePath = this.getCdkModulePath();
    if (cdkModulePath) {
      const cdkModule = require(cdkModulePath);

      new cdkModule.Infrastructure(this, id, {
        functions: cdkFunctions,
        self: this.serverless.service
      });
    }
  }

  getCdkModulePath(): string | undefined {
    const cdkModulePath = this.serverless.service.provider.cdkModulePath;
    if (!cdkModulePath) {
      return undefined;
    }

    if (path.isAbsolute(cdkModulePath)) {
      return cdkModulePath;
    }

    return path.join(this.serverless.config.servicePath, cdkModulePath);
  }
}
