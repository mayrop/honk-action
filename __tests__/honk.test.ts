import * as github from '@actions/github'
import * as core from '@actions/core'
import {WebhookPayload} from '@actions/github/lib/interfaces'
import nock from 'nock'
import run from '../src/honk'

beforeEach(() => {
  // resetModules allows you to safely change the environment and mock imports
  // separately in each of your tests
  // https://github.com/Keyang/node-csvtojson/issues/271
  // jest.resetModules()
  jest.spyOn(core, 'getInput').mockImplementation((name: string): string => {
    if (name === 'token') return '12345'
    return ''
  })

  process.env['GITHUB_REPOSITORY'] = 'example/repository'

  // Create a mock payload for our tests to use
  // https://developer.github.com/v3/activity/events/types/#issuecommentevent
  github.context.payload = {
    action: 'created',
    issue: {
      number: 1,
    },
    comment: {
      id: 1,
      user: {
        login: 'monalisa',
      },
      body: 'Honk',
    },
  } as WebhookPayload
})

afterEach(() => {
  expect(nock.pendingMocks()).toEqual([])
  nock.isDone()
  nock.cleanAll()
})

describe('honk action', () => {
  // The most basic test is just checking that the run method doesn't throw an error.
  // This test relies on our default payload which contains "honk" in the comment body.
  it('runs', async () => {
    await expect(run()).resolves.not.toThrow()
  })

  it('deletes the comment and adds a comment', async () => {
    // // Use nock to mock out the external call to create the honk comment
    // // Setting this up creates an expectation that must be called and returns a 200 response
    nock('https://api.github.com').get(`/repos/example/repository`).reply(200, {
      url: 'https://github.com/#example',
      default_branch: 'master',
    })

    nock('https://api.github.com')
      .get(`/repos/example/repository/commits?sha=master&per_page=2`)
      .reply(200, [
        {
          sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
        },
        {
          sha: '05e95bff4dd8f61038c3450b0064a1c28d55803f',
        },
      ])

    nock('https://api.github.com')
      .patch(`/repos/example/repository/git/refs/refs/heads/master`, (inputs) => {
        console.log('inputs', inputs.sha == '80d4ead42d33eb92553d5ccc74daa9c620e3e365')
        return true
      })
      .reply(201, {
        ref: 'refs/heads/master',
        node_id: 'MDM6UmVmcmVmcy9oZWFkcy9mZWF0dXJlQQ==',
        url: 'https://api.github.com/repos/octocat/Hello-World/git/refs/heads/featureA',
        object: {
          type: 'commit',
          sha: 'aa218f56b14c9653891f9e74264a383fa43fefbd',
          url: 'https://api.github.com/repos/octocat/Hello-World/git/commits/aa218f56b14c9653891f9e74264a383fa43fefbd',
        },
      })

    await run()
  })
})
