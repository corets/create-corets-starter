#!/usr/bin/env node

const path = require("path")
const chalk = require("chalk")
const inquirer = require("inquirer")
const { Command } = require("commander")
const packageJson = require("./package.json")
const sh = require("shelljs")

const CWD = process.cwd()
const CLI = new Command()
const TEMPLATES = [
  { name: "TypeScript Library", value: "typescript-library" },
  { name: "React Library", value: "react-library" },
]

CLI
  .version(packageJson.version)
  .arguments("<target>")
  .option("--template <template>", "template name")
  .option("--package <package>", "package name")

  .action(async (targetInput, args) => {
    const target = path.resolve(CWD, targetInput)
    let { template, package } = args

    if (sh.test('-e', target)) {
      console.error(`error: target directory '${targetInput}' already exists`)
      process.exit(1)
    }

    console.log(chalk.whiteBright.bold(`Project directory:`), chalk.cyan(target))

    let templatePath = path.resolve(__dirname, `templates/${template}`)

    const templateTest = () => sh.test('-d', templatePath)

    if (templateTest()) {
      console.log(chalk.whiteBright.bold(`Project template:`), chalk.cyan(template))
    } else {
      while (!templateTest()) {
        const answers = await inquirer.prompt(
          {
            name: "template",
            type: "list",
            choices: TEMPLATES,
            message: "Choose project template:",
          },
        )

        template = answers.template
        templatePath = path.resolve(__dirname, `templates/${template}`)
      }
    }

    const packageTest = () => !! package

    if (packageTest()) {
      console.log(chalk.whiteBright.bold(`Package name:`), chalk.cyan(package))
    } else {
      while (!package) {
        const answers = await inquirer.prompt({
          name: "package",
          type: "input",
          message: "Choose package name:",
          default: `@corets/${path.basename(target)}`,
        })

        package = answers.package
      }
    }

    sh.cp("-r", templatePath, target)
    sh.mv(`${target}/_package.json`, `${target}/package.json`)
    sh.ls("-A", `${ target }/.*`, `${ target }/*`).forEach(file => {
      sh.sed("-i", "__PACKAGE_NAME__", package, file)
      sh.sed("-i", "__REPOSITORY__", package.replace('@', ''), file)
    })

    console.log()
    console.log(chalk.whiteBright.bold("Created files:"))
    console.log()

    sh.ls("-A", `${ target }/.*`, `${ target }/*`).forEach(file => {
      console.log('    ', file.replace(`${target}/`, ""))
    })

    console.log()
    console.log(chalk.whiteBright.bold("Run to finish setup:"))
    console.log()
    console.log(`    cd ${ targetInput } && yarn install`)
    console.log()
    console.log("Don't forget to double check the", chalk.whiteBright("repository"), "field in", chalk.whiteBright("package.json"))
    console.log("Don't forget to update", chalk.whiteBright("description"), "in", chalk.whiteBright(`readme.md`))
    console.log()
  })

  .parse(process.argv)
