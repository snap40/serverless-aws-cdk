import BbPromise = require("bluebird");
import serverless = require("../types/serverless");
import { AwsCdkProvider } from "../provider";

import { bootstrapToolkitStack } from "../cdk/toolkitStack";
import { deployStack } from "../cdk/deployStack";
import { deployFunction, validateArgs } from "../cdk/deployFunction";

export class AwsCdkDeploy {
  options: any;
  serverless: serverless;
  provider: AwsCdkProvider;
  hooks: { [name: string]: CallableFunction };

  constructor(serverless: serverless, options: any) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider("aws-cdk");

    this.hooks = {
      "before:deploy:deploy": () =>
        BbPromise.bind(this).then(bootstrapToolkitStack.bind(this)),

      "deploy:deploy": () => BbPromise.bind(this).then(deployStack.bind(this)),

      "deploy:function:initialize": () =>
        BbPromise.bind(this).then(validateArgs.bind(this)),

      'deploy:function:packageFunction': () =>
            this.serverless.pluginManager.spawn('package:function'),

      "deploy:function:deploy": () =>
        BbPromise.bind(this).then(deployFunction.bind(this))
    };
  }
}
