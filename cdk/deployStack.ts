import { buildToolkit } from './toolkit'
import { AwsCdkDeploy } from '../deploy';

export async function deployStack(this: AwsCdkDeploy) {
  const toolkit = await buildToolkit(this.provider);
  const roleArn = this.provider.getCfnRoleArn();

  await toolkit.deploy({
    stackNames: [this.provider.getStackName()],
    roleArn: roleArn
  });
}
