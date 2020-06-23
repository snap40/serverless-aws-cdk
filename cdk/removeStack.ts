import { buildToolkit } from './toolkit'
import { AwsCdkRemove } from '../remove';

export async function dummyArtifactsBeforeRemoveStack(this: AwsCdkRemove) {
  const functionNames: string[] = this.serverless.service.getAllFunctions();

  functionNames.forEach((functionName: string) => {
    const func = this.serverless.service.getFunction(functionName);
    func.package = func.package || {
      artifact: 'SERVERLESS-AWS-CDK-DUMMY'
    };
  });
}

export async function removeStack(this: AwsCdkRemove) {
  const toolkit = await buildToolkit(this.provider);
  const roleArn = this.provider.getCfnRoleArn();

  await toolkit.destroy({
    stackNames: [this.provider.getStackName()],
    exclusively: false,
    force: false,
    roleArn: roleArn
  });
}
