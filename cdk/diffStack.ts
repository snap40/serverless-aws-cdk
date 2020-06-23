import { buildToolkit } from './toolkit'
import { AwsCdkDiff } from '../diff';

export async function diffStack(this: AwsCdkDiff) {
  const toolkit = await buildToolkit(this.provider);
  await toolkit.diff({
    stackNames: [this.provider.getStackName()]
  });
}
