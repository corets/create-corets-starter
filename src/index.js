#!/usr/bin/env node

const path = require("path")
const chalk = require("chalk")
const inquirer = require("inquirer")
const { Command } = require("commander")
const packageJson = require("../package.json")
const sh = require("shelljs")

const CWD = process.cwd()
const CLI = new Command()
const TEMPLATES = [
  { name: "TypeScript Library", value: "typescript-library" },
  { name: "React Library", value: "react-library" },
]

CLI.version(packageJson.version)
  .arguments("[target]")
  .option("--template <template>", "template name")
  .option("--package <package>", "package name")

  .action(async (target, args) => {
    console.log()
    console.log(`Current version: ${packageJson.version}`)
    console.log()

    let { template, package } = args

    const resolveTarget = (name) => path.resolve(CWD, name || "")
    let targetPath = resolveTarget(target)
    const targetTest = (name, path) => !!name && !sh.test("-e", path)

    do {
      if (target && sh.test("-e", targetPath)) {
        console.log("error: Target directory already exists")
      }

      const answers = await inquirer.prompt({
        name: "target",
        type: "input",
        message: "Choose target directory:",
        default: target,
      })

      target = answers.target
      targetPath = resolveTarget(target)
    } while (!targetTest(target, targetPath))

    const resolveTemplate = (name) =>
      path.resolve(__dirname, `../templates/${name}`)
    let templatePath = resolveTemplate(template)
    const templateTest = (path) => sh.test("-d", path)

    if (templateTest(templatePath)) {
      console.log(
        chalk.whiteBright.bold(`Project template:`),
        chalk.cyan(template)
      )
    } else {
      while (!templateTest(templatePath)) {
        const answers = await inquirer.prompt({
          name: "template",
          type: "list",
          choices: TEMPLATES,
          message: "Choose project template:",
        })

        template = answers.template
        templatePath = resolveTemplate(template)
      }
    }

    const packageTest = () => !!package

    if (packageTest()) {
      console.log(chalk.whiteBright.bold(`Package name:`), chalk.cyan(package))
    } else {
      while (!package) {
        const answers = await inquirer.prompt({
          name: "package",
          type: "input",
          message: "Choose package name:",
          default: `@corets/${path.basename(targetPath)}`,
        })

        package = answers.package
      }
    }

    let [githubOrganisation, githubRepositoryName] =
      package.indexOf("@") === 0
        ? package.replace("@", "").split("/")
        : ["", package]

    do {
      const answers = await inquirer.prompt({
        name: "githubOrganisation",
        type: "input",
        message: "GitHub organisation or username:",
        default: githubOrganisation,
      })

      githubOrganisation = answers.githubOrganisation
    } while (!githubOrganisation)

    do {
      const answers = await inquirer.prompt({
        name: "githubRepositoryName",
        type: "input",
        message: "GitHub repository name:",
        default: githubRepositoryName,
      })

      githubRepositoryName = answers.githubRepositoryName
    } while (!githubOrganisation)

    sh.cp("-r", templatePath, targetPath)
    sh.mv(`${targetPath}/_package.json`, `${targetPath}/package.json`)
    sh.find(targetPath)
      .filter(
        (file) =>
          !file.includes(".git/") && file !== ".git" && sh.test("-f", file)
      )
      .forEach((file) => {
        sh.sed("-i", /__PACKAGE_NAME__/g, package, file)
        sh.sed(
          "-i",
          /__REPOSITORY__/g,
          `${githubOrganisation}/${githubRepositoryName}`,
          file
        )
        sh.sed("-i", /__GITHUB_ORGANISATION__/g, githubOrganisation, file)
        sh.sed("-i", /__GITHUB_REPOSITORY_NAME__/g, githubRepositoryName, file)
      })

    sh.cd(targetPath)
      .exec("git init &>/dev/null")
      .exec(
        `git remote add origin git@github.com:${githubOrganisation}/${githubRepositoryName}.git`
      )

    console.log()
    console.log(chalk.whiteBright.bold("Created files:"))
    console.log()

    sh.ls("-A", targetPath).forEach((file) => {
      console.log("    ", file.replace(`${targetPath}/`, ""))
    })

    console.log()
    console.log(
      chalk.whiteBright("GitHub repository initiated:"),
      `https://github.com/${githubOrganisation}/${githubRepositoryName}`
    )

    console.log()
    console.log(chalk.whiteBright.bold("Run to finish setup:"))
    console.log()
    console.log(`    cd ${target} && yarn install`)
    console.log()
    console.log(
      "Don't forget to double check the",
      chalk.whiteBright("repository"),
      "field in",
      chalk.whiteBright("package.json")
    )
    console.log(
      "Don't forget to update",
      chalk.whiteBright("description"),
      "in",
      chalk.whiteBright(`readme.md`)
    )
    console.log()
  })

  .parse(process.argv)
