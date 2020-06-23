import cxapi = require('@aws-cdk/cx-api');
import cdk = require('@aws-cdk/core');
import { ServerlessStack } from './serverlessStack'
import { AwsCdkProvider } from '../provider';

export async function buildApp(provider: AwsCdkProvider): Promise<cdk.App> {
    if (!provider.tsCompiled) {
        await provider.serverless.pluginManager.spawn('cdk-compile');
        provider.tsCompiled = true;
    }

    const accountId = await provider.getAccountId();
    const region = provider.getRegion();
    const stage = provider.getStage();

    const environment: cxapi.Environment = {
        name: stage,
        account: accountId,
        region: region
    };
    const stackName = provider.getStackName();
    const tags = provider.getStackTags();

    const outdir = provider.getCdkOutputPath();
    const app = new cdk.App({outdir: outdir});
    new ServerlessStack(app, stackName, {
        provider: provider,
        env: environment,
        tags: tags
    });

    return app;
}
