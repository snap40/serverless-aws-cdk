import * as ts from "typescript";
import { AwsCdkCompile } from '../compile';

export function compile(this: AwsCdkCompile) {
    const host = ts.createSolutionBuilderHost();
    const tsconfig = this.provider.getCdkTsconfigPath();
    this.serverless.cli.log(`Compiling TypeScript infrastructure definition with config ${tsconfig}...`);
    const builder = ts.createSolutionBuilder(host, [tsconfig], {});
    const exitStatus = builder.build();
    if (exitStatus != 0) {
        throw new Error('TypeScript compilation failed');
    }
}

export function clean(this: AwsCdkCompile) {
    const host = ts.createSolutionBuilderHost();
    const tsconfig = this.provider.getCdkTsconfigPath();
    this.serverless.cli.log(`Cleaning TypeScript infrastructure definition with config ${tsconfig}...`);
    const builder = ts.createSolutionBuilder(host, [tsconfig], {});
    const exitStatus = builder.clean();
    if (exitStatus != 0) {
        throw new Error('TypeScript clean failed');
    }
}
