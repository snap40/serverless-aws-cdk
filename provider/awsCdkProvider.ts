import _ = require("lodash");
import serverless = require("serverless");
import {ISDK, SdkProvider, Mode} from "aws-cdk";
import path = require("path");
import cxapi = require("@aws-cdk/cx-api");

interface AccountInfo {
  accountId: string;
  partition: string;
}

export class AwsCdkProvider {
  static constants = {
    providerName: "aws-cdk",
    outDirRelativePath: ".serverless-aws-cdk-assembly",
  };

  options: any;
  serverless: serverless;
  tsCompiled: boolean = false;

  private sdkProvider: SdkProvider;

  static getProviderName() {
    return AwsCdkProvider.constants.providerName;
  }

  constructor(serverless: serverless, options: any) {
    this.options = options;
    this.serverless = serverless;

    this.serverless.setProvider(AwsCdkProvider.constants.providerName, this);

    const exclude = this.serverless.service.package.exclude;
    const excludedFiles = [`${AwsCdkProvider.constants.outDirRelativePath}/**`];
    this.serverless.service.package.exclude =
      exclude instanceof Array ? exclude.concat(excludedFiles) : excludedFiles;
  }

  setupLogging() {
    const oldConsole = console;
    this.serverless.cli.consoleLog = function (message: string) {
      oldConsole.log(message); // eslint-disable-line no-console
    };

    const nopLog = function (..._args: any) {};

    if (process.env.SLS_DEBUG) {
      console.trace = this.serverless.cli.log;
      console.log = this.serverless.cli.log;
    } else {
      console.trace = nopLog;
      console.log = nopLog;
    }
    console.warn = this.serverless.cli.log;
    console.error = this.serverless.cli.log;
  }

  getValues(source: object, paths: string[][]): {path: string[]; value: any}[] {
    return paths.map((path) => ({
      path,
      value: _.get(source, path.join(".")),
    }));
  }

  firstValue(
    values: {path: string[]; value: any}[]
  ): {path: string[]; value: any} {
    return values.reduce(
      (result, current) => (result.value ? result : current),
      {path: [], value: undefined}
    );
  }

  getStageSourceValue(): {path: string[]; value: any} {
    const values = this.getValues(this, [
      ["options", "stage"],
      ["serverless", "config", "stage"],
      ["serverless", "service", "provider", "stage"],
    ]);
    return this.firstValue(values);
  }
  getStage(): string {
    const defaultStage = "dev";
    const stageSourceValue = this.getStageSourceValue();
    return stageSourceValue.value || defaultStage;
  }

  async getAccountId(): Promise<string> {
    return (await this.getAccountInfo()).accountId;
  }

  getAccountIdSourceValue(): {path: string[]; value: any} {
    const values = this.getValues(this, [
      ["options", "accountId"],
      ["serverless", "config", "accountId"],
      ["serverless", "service", "provider", "accountId"],
    ]);
    return this.firstValue(values);
  }

  getPartitionSourceValue(): {path: string[]; value: any} {
    const values = this.getValues(this, [
      ["options", "partition"],
      ["serverless", "config", "partition"],
      ["serverless", "service", "provider", "partition"],
    ]);
    return this.firstValue(values);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const account = await (await this.getSdkProvider()).defaultAccount();

    const accountId = this.getAccountIdSourceValue().value;
    const partition = this.getPartitionSourceValue().value;

    return {
      accountId: accountId || account?.accountId,
      partition: partition || account?.partition,
    };
  }

  getRegionSourceValue(): {path: string[]; value: any} {
    const values = this.getValues(this, [
      ["options", "region"],
      ["serverless", "config", "region"],
      ["serverless", "service", "provider", "region"],
    ]);
    return this.firstValue(values);
  }
  getRegion(): string {
    const defaultRegion = "us-east-1";
    const regionSourceValue = this.getRegionSourceValue();
    return regionSourceValue.value || defaultRegion;
  }

  getProfileSourceValue(): string {
    const values = this.getValues(this, [
      ["options", "aws-profile"],
      ["options", "profile"],
      ["serverless", "config", "profile"],
      ["serverless", "service", "provider", "profile"],
    ]);
    const firstVal = this.firstValue(values);
    return firstVal ? firstVal.value : null;
  }
  getProfile(): string {
    return this.getProfileSourceValue();
  }

  getStackName(): string {
    return (
      this.serverless.service.provider.stackName ||
      `${this.serverless.service.service}-${this.getStage()}`
    );
  }

  getStackTags(): {[key: string]: string} {
    return this.serverless.service.provider.stackTags || {};
  }

  getCfnRoleArn(): string | undefined {
    return this.serverless.service.provider.cfnRole || undefined;
  }

  getServiceName(): string {
    return this.serverless.service;
  }

  getDeploymentBucketName(): string | undefined {
    const deploymentBucketConfig = this.serverless.service.provider
      .deploymentBucket;
    if (deploymentBucketConfig && deploymentBucketConfig.name) {
      return deploymentBucketConfig.name;
    } else {
      return undefined;
    }
  }

  getCdkOutputPath(): string {
    const servicePath = this.serverless.config.servicePath;
    return path.join(servicePath, AwsCdkProvider.constants.outDirRelativePath);
  }

  getCdkTsconfigPath(): string {
    const tsConfig =
      this.serverless.service.provider.tsConfigPath || "tsconfig.json";
    if (path.isAbsolute(tsConfig)) {
      return tsConfig;
    }

    return path.join(this.serverless.config.servicePath, tsConfig);
  }

  canonicalise(value: string): string {
    const regex = /[^a-zA-Z0-9-]+/;
    return value.replace(regex, "-");
  }

  makeAlphanumeric(value: string): string {
    const regex = /[^a-zA-Z0-9]+/g;
    return value.replace(regex, "");
  }

  getPackagePath() {
    return (
      this.options.package ||
      this.serverless.service.package.path ||
      path.join(this.serverless.config.servicePath || ".", ".serverless")
    );
  }

  getFunctionZipPath(functionName: string): string {
    const functionArtifactFileName = `${functionName}.zip`;
    const functionObject = this.serverless.service.getFunction(functionName);
    functionObject.package = functionObject.package || {};
    const artifactFilePath =
      functionObject.package.artifact ||
      this.serverless.service.package.artifact;

    if (
      !artifactFilePath ||
      (this.serverless.service.artifact && !functionObject.package.artifact)
    ) {
      if (
        this.serverless.service.package.individually ||
        functionObject.package.individually
      ) {
        const artifactFileName = functionArtifactFileName;
        return path.join(this.getPackagePath(), artifactFileName);
      }

      return path.join(
        this.getPackagePath(),
        `${this.serverless.service.service}.zip`
      );
    }

    return artifactFilePath;
  }

  async getEnvironment(): Promise<cxapi.Environment> {
    const accountId = await this.getAccountId();
    const region = this.getRegion();
    const stage = this.getStage();

    const environment: cxapi.Environment = {
      name: stage,
      account: accountId,
      region: region,
    };

    return environment;
  }

  async getSdk(): Promise<ISDK> {
    const assumeRoleArn = this.getCfnRoleArn();
    const sdkProvider = await this.getSdkProvider();
    if (!!assumeRoleArn) {
      return await sdkProvider.withAssumedRole(
        assumeRoleArn,
        await this.getAccountId(),
        this.getRegion()
      );
    } else {
      return await sdkProvider.forEnvironment(
        await this.getEnvironment(),
        Mode.ForWriting
      );
    }
  }
  async getSdkProvider(): Promise<SdkProvider> {
    if (!this.sdkProvider) {
      this.sdkProvider = await SdkProvider.withAwsCliCompatibleDefaults({
        profile: this.getProfile(),
      });
    }

    return this.sdkProvider;
  }

  getCfnExecutionPolicies(): string[] {
    const values = this.getValues(this, [
      ["options", "cloudFormationExecutionPolicies"],
      ["serverless", "config", "cloudFormationExecutionPolicies"],
      ["serverless", "service", "provider", "cloudFormationExecutionPolicies"],
    ]);
    return (
      this.firstValue(values).value || [
        "arn:aws:iam::aws:policy/AdministratorAccess",
      ]
    );
  }
}
