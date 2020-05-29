import * as github from '@actions/github'
import * as core from '@actions/core'
import {WebhookPayload} from '@actions/github/lib/interfaces'
import nock from 'nock'
import run from '../honk'

beforeEach(() => {
  // resetModules allows you to safely change the environment and mock imports
  // separately in each of your tests
  jest.resetModules()
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
    // Override the default payload so that it doesn't include "honk". This should make the
    // action run through more of the code
    github.context.payload.comment.body = 'No geese allowed'

    // Use nock to mock out the external call to delete the comment
    // Setting this up creates an expectation that must be called and returns a 200 response
    nock('https://api.github.com').delete('/repos/example/repository/issues/comments/1').reply(200, {})

    // Use nock to mock out the external call to create the honk comment
    // Setting this up creates an expectation that must be called and returns a 200 response
    nock('https://api.github.com')
      .post(`/repos/example/repository/issues/1/comments`, (body) => {
        return (
          body.body ===
          '![honk](https://user-images.githubusercontent.com/4064/65900857-cf462f80-e36b-11e9-9a9c-76170c99618b.png)'
        )
      })
      .reply(200, {
        url: 'https://github.com/#example',
      })

    await run()
  })
})
