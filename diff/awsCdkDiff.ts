import BbPromise = require('bluebird');
import serverless = require('serverless');
import { AwsCdkProvider } from '../provider';

import { diffStack } from '../cdk/diffStack';

export class AwsCdkDiff {
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
      'diff:diff': () => BbPromise.bind(this)
        .then(() => this.serverless.pluginManager.spawn('package'))
        .then(diffStack.bind(this))
    };

    this.commands = {
      diff: {
        usage: 'Shows the difference between the deployed infrastructure and the local code',
        configDependent: true,
        lifecycleEvents: [
          'diff'
        ],
        options: {
          stage: {
            usage: 'Stage of the service',
            shortcut: 's',
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r',
          },
        },
      }
    }
  }

}
