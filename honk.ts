import * as core from '@actions/core'
import * as github from '@actions/github'
import {execSync} from 'child_process'

const gitCommand = 'git rev-parse HEAD'

const getGitCommitHash = () => {
  return execSync(gitCommand).toString().trim()
}

const getCurrentHead = () => {
  return execSync('git symbolic-ref --short HEAD 2> /dev/null || git rev-parse HEAD').toString().trim()
}

const runReleaseCommand = () => {
  return execSync('standard-version').toString().trim()
}

const run = async (): Promise<void> => {
  try {
    // console.log(semver)
    // Our action will need to API access the repository so we require a token
    // This can be set in the calling workflow or it can use the default
    const token = process.env['GITHUB_TOKEN'] || core.getInput('token')

    if (!token || token === '') return

    // Create the octokit client
    const octokit: github.GitHub = new github.GitHub(token)

    // The environment contains a variable for current repository. The repository
    // will be formatted as a name with owner (`nwo`); e.g., jeffrafter/example
    // We'll split this into two separate variables for later use
    const nwo = process.env['GITHUB_REPOSITORY'] || '/'
    const [owner, repo] = nwo.split('/')

    // Options are the same as command line, except camelCase
    // standardVersion returns a Promise
    runReleaseCommand()

    const response = await octokit.request('GET /repos/:owner/:repo', {
      owner,
      repo,
    })

    const base = process.env['GITHUB_BASE_BRANCH'] || response.data.default_branch

    const commits = await octokit.request('GET /repos/:owner/:repo/commits', {
      owner,
      repo,
      sha: base,
      per_page: 2,
    })

    const lastCommits = commits.data.map((commit: {sha: string}) => commit.sha)

    const lastCommitSha = getGitCommitHash()

    const head = getCurrentHead()

    if (!lastCommits.includes(lastCommitSha)) {
      await octokit.git.updateRef({
        owner,
        repo,
        sha: lastCommitSha,
        ref: `refs/heads/${head}`,
        force: true,
      })
    }
    // This action works on issue comments. Because of this we expect the context
    // payload to contain the issue and the comment

    // const issue = github.context.payload['issue']
    // if (!issue) return
    // const comment = github.context.payload.comment
    // const commentBody = comment.body
    // // If the comment contains "honk" anywhere in the body, there is nothing for our action to do
    // if (commentBody.match(/honk/i)) return
    // // The comment didn't contain "honk", delete it
    // // https://octokit.github.io/rest.js/#octokit-routes-issues-delete-comment
    // const deleteCommentResponse = await octokit.issues.deleteComment({
    //   owner,
    //   repo,
    //   comment_id: comment.id,
    // })
    // console.log(`Deleted comment! ${JSON.stringify(deleteCommentResponse.status)}`)
    // // Add a new comment that says honk
    // // https://octokit.github.io/rest.js/#octokit-routes-issues-create-comment
    // const issueCommentResponse = await octokit.issues.createComment({
    //   owner,
    //   repo,
    //   issue_number: issue.number,
    //   body: '![honk](https://user-images.githubusercontent.com/4064/65900857-cf462f80-e36b-11e9-9a9c-76170c99618b.png)',
    // })
    // console.log(`Honk! ${issueCommentResponse.data.url}`)
  } catch (error) {
    console.error(error)
    // If there is any error we'll fail the action with the error message
    console.error(error.message)
    core.setFailed(`Honk-action failure: ${error}`)
  }
}

// Don't auto-execute in the test environment
if (process.env['NODE_ENV'] !== 'test') {
  run()
}

export default run
