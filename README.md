# AWS CDK Serverless Plugin

![](https://media.giphy.com/media/VeBeB9rR524RW/giphy.gif)

This is the (unofficial) AWS CDK Serverless Plugin. It allows you to use the
magic of CDK from within the Serverless framework, so you can combine all the
power of defining your infrastructure in a real, fully-fledged programming
language with Serverless' packaging and plugin ecosystem.

From the [AWS CDK project]()'s README:

> The *AWS Cloud Development Kit (AWS CDK)* is an open-source software
> development framework to define cloud infrastructure in code and provision it
> through AWS CloudFormation.

> It offers a high-level object-oriented abstraction to define AWS resources
> imperatively using the power of modern programming languages. Using the CDK’s
> library of infrastructure constructs, you can easily encapsulate AWS best
> practices in your infrastructure definition and share it without worrying
> about boilerplate logic.

CDK supports multiple languages for infrastructure definition, but right now the
Serverless plugin only supports JavaScript/TypeScript. If you need support for
other languages, feel free to raise an issue or dive into the code yourself!

## Getting Started
You install the AWS CDK Serverless plugin similarly to any other plugin, by running:

```sh
sls plugin install -n serverless-aws-cdk
```

Then, you need to set your provider to `aws-cdk` in your `serverless.yml`, and
set the path to your CDK definition's root module:

```
provider:
  name: aws-cdk
  cdkModulePath: ./cdk
```

You'll also need to create a `tsconfig.json`, telling the TypeScript compiler
how to compile your CDK definitions:
```json
{
    "compilerOptions": {
        "target":"ES2018",
        "module": "commonjs",
        "lib": ["es2016", "es2017.object", "es2017.string"],
        "declaration": true,
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noImplicitThis": true,
        "alwaysStrict": true,
        "noUnusedLocals": false,
        "noUnusedParameters": false,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": false,
        "inlineSourceMap": true,
        "inlineSources": true,
        "experimentalDecorators": true,
        "strictPropertyInitialization":false
    },
    "exclude": ["cdk.out/**/*", "node_modules/**/*"]
}
```

TODO: `tsconfig.json` path is configurable, right?

`serverless-aws-cdk` transpiles infrastructure code to `*.js` and `*.d.ts`
files, and it stores state in `.serverless-aws-cdk-assembly`. You may want to
add those to your `.gitignore`. An example `.gitignore` is as follows (note: the
following assumes your CDK code is under `/cdk`):

```gitignore
/.serverless/
/.serverless/
/node_modules/
/.log/
/.serverless-aws-cdk-assembly/
/cdk/**/*.js
/cdk/**/*.d.ts
```

Finally, your CDK infrastructure must be defined in a class named
`Infrastructure` within the defined `cdkModulePath`. In this instance, you can
create a file named `cdk/index.ts` containing the following:

```typescript
import { api as ServerlessAwsCdk } from 'serverless-aws-cdk';
import * as cdk from '@aws-cdk/core'

export class Infrastructure extends ServerlessAwsCdk.InfrastructureConstruct {
  constructor(scope: cdk.Construct, id: string, props: ServerlessAwsCdk.InfrastructureProps) {
    super(scope, id, props);
  }
}
```

This is the most minimal definition possible. The `props` argument to your
constructor contains two keys:
- `functions`, which is a mapping between function key (as defined in
  `serverless.yml`) and CDK `lambda.Function` object;
- `self`, which is the same object you can refer to in your `serverless.yml`
  file with the `${self:...}` syntax.

## Deployment
To deploy a stack using the `serverless-aws-cdk` plugin, all you need to do is
run `sls deploy` as usual. This will show you the progress of your stack
updating. As of v0.2.0, CDK infrastructure definitions written in TypeScript are
automatically transpiled to JavaScript for your convenience.

## Example Service

In the following example, we create a Lambda function called
"{{stage}}-serverless-aws-cdk-example-sample-lambda" and an SQS queue called
"cdk-example-queue", and we configure the queue as an event source for the
Lambda function.

First, we need to install some dependencies:

```sh
npm i @aws-cdk/aws-sqs @aws-cdk/aws-lambda-event-sources
```

Next, we create the function in `serverless.yml`. Note that the basic
configuration is similar to with the `aws` provider. However, we don't set up
event sources in `serverless.yml`, since we do that in code later.

```yaml
service: serverless-aws-cdk-example

frameworkVersion: ">=1.0.0 <2.0.0"

provider:
  name: aws-cdk
  runtime: python3.6

  stage: 'dev'
  cdkModulePath: ./cdk
  region: 'eu-west-1'
  stackName: '${self:provider.stage}-${self:service}'
  cfnRole: 'arn:aws:iam::${self:custom.env.aws_account_id}:role/CfnRole'

package:
    exclude:
        - "node_modules/**"

functions:
    sample_lambda:
        handler: handler.handler
        name: ${self:provider.stage}-${self:service}-sample-lambda
        timeout: 10
        include: sample_lambda/**

plugins:
   - serverless-aws-cdk

```

Our handler is very simple, in `sample_lambda.handler`.

```python
def handler(event, context):
    for message in event["Records"]:
        print(f'Received message {message["body"]}')
```

Now, let's define our infrastructure in `cdk/index.ts`.

```typescript
import { api as ServerlessAwsCdk } from 'serverless-aws-cdk';
import * as cdk from '@aws-cdk/core'
import * as lambdaevents from '@aws-cdk/aws-lambda-event-sources';
import * as sqs from '@aws-cdk/aws-sqs

export class Infrastructure extends ServerlessAwsCdk.InfrastructureConstruct {
  constructor(scope: cdk.Construct, id: string, props: ServerlessAwsCdk.InfrastructureProps) {
    super(scope, id, props);
    const sampleLambda = props.functions['sample_lambda'];
    const queue = sqs.Queue(this, 'SampleQueue', {
        queueName: 'cdk-example-queue'
    });
    sampleLambda.addEventSource(new lambdaevents.SqsEventSource(queue));
  }
}
```

## Configuration
There are several supported configuration options when using
`serverless-aws-cdk`. If there's something you'd like to configure but which
isn't listed here, it may be that you're able to configure it within your CDK
code.

| Key                      | Description                                                                                 | Default               |
|--------------------------|---------------------------------------------------------------------------------------------|-----------------------|
| `provider.runtime`       | Global setting for runtime of Lambda functions                                              |                       |
| `provider.stage`         | Deployment stage (e.g. `beta`, `gamma`, `prod`), used in the default naming of functions    | `dev`                 |
| `provider.cdkModulePath` | Which Javascript/Typescript module to search in to find your CDK infrastructure definitions | Don't import a module |
| `provider.region`        | The region in which to deploy your stack                                                    | `us-east-1`           |
| `provider.stackName`     | The name of the stack                                                                       | `${service}-${stage}`     |

TODO

```
provider:
  stackTags: ${self:custom.env.tags}
  cfnRole: "arn:aws:iam::${self:custom.env.aws_account_id}:role/CfnRole"
  deploymentBucket:
    name: "chealth-serverlessdeployment-${self:custom.env.aws_account_id}-${self:provider.region}"

function:
  function_name:
    runtime: foo
    name: foobar
    timeout: 10
    environment:
      FOO: bar
```

## Usage

TODO

```
Implemented:
* deploy
* diff
* remove


Missing:
* info (workaround: export as outputs)
* logs
* invoke
```
