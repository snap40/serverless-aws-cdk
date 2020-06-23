/*
  NOTE: this plugin is used to add all the different provider related plugins at once.
  This way only one plugin needs to be added to the service in order to get access to the
  whole provider implementation.
*/

import { AwsCdkProvider } from './provider'
import { AwsCdkDeploy } from './deploy'
import { AwsCdkRemove } from './remove'
import { AwsCdkDiff } from './diff'
import { AwsCdkCompile } from './compile';
import { ServerlessCdkConstructs } from './cdk';

class AwsCdkIndex {
    constructor(serverless: any, options: any) {
        serverless.pluginManager.addPlugin(AwsCdkProvider);
        serverless.pluginManager.addPlugin(AwsCdkDeploy);
        serverless.pluginManager.addPlugin(AwsCdkRemove);
        serverless.pluginManager.addPlugin(AwsCdkDiff);
        serverless.pluginManager.addPlugin(AwsCdkCompile);

        // We still need:
        //  - Info (mostly copyable from AWS)
        //  - Logs (mostly copyable from AWS)
        //  - Invoke (mostly copyable from AWS)
    }
}

namespace AwsCdkIndex {
    export import api = ServerlessCdkConstructs;
}

export = AwsCdkIndex;
