import BbPromise = require('bluebird');
import serverless = require('serverless');
import { AwsCdkProvider } from '../provider';

import { compile, clean } from '../cdk/compile';

export class AwsCdkCompile {
  options: any;
  serverless: serverless;
  provider: AwsCdkProvider;
  public hooks: { [name: string]: CallableFunction };
  public commands: { [name: string]: any };

  constructor(serverless: serverless, options: any) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws-cdk');

    this.hooks = {
      'cdk-compile:compile': () => BbPromise.bind(this)
        .then(compile.bind(this)),
      'cdk-clean:clean': () => BbPromise.bind(this)
        .then(clean.bind(this))
    };

    this.commands = {
      'cdk-compile': {
        usage: 'Compiles the TypeScript infrastructure definition',
        configDependent: true,
        lifecycleEvents: [
          'compile'
        ],
        options: {
        },
      },
      'cdk-clean': {
        usage: 'Cleans the TypeScript infrastructure definition',
        configDependent: true,
        lifecycleEvents: [
          'clean'
        ],
        options: {
        },
      }
    }
  }

}
