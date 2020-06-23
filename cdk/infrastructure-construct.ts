import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');

export module ServerlessCdkConstructs {
    export interface InfrastructureProps extends cdk.StackProps {
        functions: {[functionName: string]: lambda.Function};
        self: any;
    }

    export class InfrastructureConstruct extends cdk.Construct {
        constructor(scope: cdk.Construct, id: string, props: InfrastructureProps) {
            super(scope, id);
        }
    }
}
