import cxapi = require('@aws-cdk/cx-api');

import { CdkToolkit } from 'aws-cdk/lib/cdk-toolkit';
import { Configuration } from 'aws-cdk/lib/settings'
import { CloudAssembly } from '@aws-cdk/cx-api';
import { buildApp } from './app'
import { CloudFormationDeployments } from 'aws-cdk/lib/api/cloudformation-deployments';
import { CloudExecutable } from 'aws-cdk/lib/api/cxapp/cloud-executable';
import { AwsCdkProvider } from '../provider';

export async function buildToolkit(provider: AwsCdkProvider) {
  async function synthesizer(this: AwsCdkProvider, _aws: any, config: Configuration): Promise<CloudAssembly> {
    const context = config.context.all;
    process.env[cxapi.CONTEXT_ENV] = JSON.stringify(context);
    const app = await buildApp(this);
    return app.synth();
  }

  const configuration = new Configuration();

  const sdkProvider = await provider.getSdkProvider();

  const cloudExecutable = new CloudExecutable({ configuration, sdkProvider, synthesizer: synthesizer.bind(provider) });
  const cloudFormation = new CloudFormationDeployments({ sdkProvider });
  return new CdkToolkit({
    cloudExecutable,
    cloudFormation,
    verbose: false,
    ignoreErrors: false,
    strict: true,
    configuration,
    sdkProvider
  });
}
