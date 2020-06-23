import BbPromise = require('bluebird');
import serverless = require('serverless');
import { AwsCdkProvider } from '../provider';

import { removeStack, dummyArtifactsBeforeRemoveStack } from '../cdk/removeStack';

export class AwsCdkRemove {
  options: any;
  serverless: serverless;
  provider: AwsCdkProvider;
  hooks: { [name: string]: CallableFunction };

  constructor(serverless: serverless, options: any) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws-cdk');

    this.hooks = {
      'before:remove:remove': () => BbPromise.bind(this)
        .then(dummyArtifactsBeforeRemoveStack.bind(this)),
      'remove:remove': () => BbPromise.bind(this)
        .then(removeStack.bind(this)),
    };
  }
}
