#!/usr/bin/env node
'use strict'

/**
 * fdeops-ingest MCP - thin stdio sink for FDEOps ingest.
 * Shells out to local `fde` CLI only. Never calls SaaS.
 * MCP stdio transport: newline-delimited JSON-RPC 2.0
 * (Content-Length frames are accepted on input).
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_NAME = 'fdeops-ingest'
const SERVER_VERSION = require('./package.json').version

const ENGAGEMENT_PROP = {
  type: 'string',
  description:
    'Path to this client\'s .fde/ folder (from `fde resume --bind`). Optional if FDEOPS_ENGAGEMENT is set or the process cwd is already bound.',
}

const TOOLS = [
  {
    name: 'ingest_stage',
    description:
      'Stage raw content into the engagement inbox (.inbox/). Does not write .fde/. Prefer the fde ingest CLI when the workspace is already bound.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Raw text to stage (transcript, email body, notes).',
        },
        source: {
          type: 'string',
          description: 'Provenance label (e.g. granola, slack, notion, file, manual). Default: manual.',
        },
        title: {
          type: 'string',
          description: 'Optional human-readable title for the staged item.',
        },
        engagement: ENGAGEMENT_PROP,
      },
      required: ['content'],
    },
  },
  {
    name: 'ingest_list',
    description: 'List staged items in the current engagement inbox.',
    inputSchema: {
      type: 'object',
      properties: { engagement: ENGAGEMENT_PROP },
    },
  },
  {
    name: 'ingest_propose',
    description:
      'Propose debrief routing for a staged item (writes .fde/.debrief-propose; does not apply).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Staged filename or id from ingest_list.',
        },
        engagement: ENGAGEMENT_PROP,
      },
      required: ['id'],
    },
  },
  {
    name: 'ingest_apply',
    description:
      'Apply the current debrief proposal into .fde/ memory (requires prior FDE confirm).',
    inputSchema: {
      type: 'object',
      properties: { engagement: ENGAGEMENT_PROP },
    },
  },
]

let readBuffer = Buffer.alloc(0)

function writeMessage(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`)
}

// MCP stdio frames messages by newline. Content-Length headers are tolerated on
// input only, so an LSP-style client still gets through.
function parseMessages() {
  const messages = []
  while (readBuffer.length) {
    if (/^Content-Length:/i.test(readBuffer.slice(0, 15).toString('utf8'))) {
      const headerEnd = readBuffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) break
      const header = readBuffer.slice(0, headerEnd).toString('utf8')
      const match = header.match(/Content-Length:\s*(\d+)/i)
      if (!match) {
        readBuffer = readBuffer.slice(headerEnd + 4)
        continue
      }
      const length = parseInt(match[1], 10)
      const bodyStart = headerEnd + 4
      if (readBuffer.length < bodyStart + length) break
      const body = readBuffer.slice(bodyStart, bodyStart + length).toString('utf8')
      readBuffer = readBuffer.slice(bodyStart + length)
      try {
        messages.push(JSON.parse(body))
      } catch (_) {}
      continue
    }

    const newline = readBuffer.indexOf('\n')
    if (newline === -1) break
    const line = readBuffer.slice(0, newline).toString('utf8').trim()
    readBuffer = readBuffer.slice(newline + 1)
    if (!line) continue
    try {
      messages.push(JSON.parse(line))
    } catch (_) {}
  }
  return messages
}

function resolveFde() {
  const override = (process.env.FDEOPS_FDE || '').trim()
  if (override) return { cmd: override, prefix: [] }

  const local = path.join(__dirname, '..', '..', 'bin', 'fde.js')
  if (fs.existsSync(local)) return { cmd: process.execPath, prefix: [local] }

  return { cmd: 'fde', prefix: [] }
}

function fdeEnv() {
  const env = { ...process.env }
  for (const key of ['HOME', 'FDEOPS_ENGAGEMENT', 'FDEOPS_ENGAGEMENTS_ROOT']) {
    if (process.env[key] !== undefined) env[key] = process.env[key]
  }
  return env
}

function runFde(args, stdin, extraEnv) {
  const { cmd, prefix } = resolveFde()
  const result = spawnSync(cmd, [...prefix, ...args], {
    env: { ...fdeEnv(), ...(extraEnv || {}) },
    input: stdin ?? undefined,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? (result.error ? 1 : 0),
    error: result.error ? String(result.error.message || result.error) : null,
  }
}

function engagementEnv(args) {
  const p = args && typeof args.engagement === 'string' ? args.engagement.trim() : ''
  return p ? { FDEOPS_ENGAGEMENT: p } : {}
}

function cliPayload(out) {
  const payload = { stdout: out.stdout, stderr: out.stderr, status: out.status }
  if (out.error) payload.spawnError = out.error
  return payload
}

function toolResult(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  return { content: [{ type: 'text', text }] }
}

function toolError(payload) {
  const result = toolResult(payload)
  result.isError = true
  return result
}

function handleToolCall(name, args) {
  args = args || {}
  const extraEnv = engagementEnv(args)

  switch (name) {
    case 'ingest_stage': {
      if (!args.content || typeof args.content !== 'string') {
        return toolError('Missing required argument: content')
      }
      const source = args.source || 'manual'
      const cliArgs = ['ingest', 'stage', '--source', source]
      if (args.title) cliArgs.push('--title', args.title)
      const out = runFde(cliArgs, args.content, extraEnv)
      const payload = cliPayload(out)
      return out.status === 0 ? toolResult(payload) : toolError(payload)
    }
    case 'ingest_list': {
      const out = runFde(['ingest', 'list'], undefined, extraEnv)
      const payload = cliPayload(out)
      return out.status === 0 ? toolResult(payload) : toolError(payload)
    }
    case 'ingest_propose': {
      if (!args.id) return toolError('Missing required argument: id')
      const out = runFde(['ingest', 'propose', String(args.id)], undefined, extraEnv)
      const payload = cliPayload(out)
      return out.status === 0 ? toolResult(payload) : toolError(payload)
    }
    case 'ingest_apply': {
      const out = runFde(['ingest', 'apply'], undefined, extraEnv)
      const payload = cliPayload(out)
      return out.status === 0 ? toolResult(payload) : toolError(payload)
    }
    default:
      return toolError(`Unknown tool: ${name}`)
  }
}

function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return

  const { id, method, params } = msg

  if (id === undefined && method) return

  if (method === 'initialize') {
    writeMessage({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      },
    })
    return
  }

  if (method === 'tools/list') {
    writeMessage({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
    return
  }

  if (method === 'tools/call') {
    try {
      const result = handleToolCall(params?.name, params?.arguments)
      writeMessage({ jsonrpc: '2.0', id, result })
    } catch (err) {
      writeMessage({
        jsonrpc: '2.0',
        id,
        result: toolError(String(err.message || err)),
      })
    }
    return
  }

  if (method === 'ping') {
    writeMessage({ jsonrpc: '2.0', id, result: {} })
    return
  }

  if (id !== undefined) {
    writeMessage({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    })
  }
}

process.stdin.on('data', (chunk) => {
  readBuffer = Buffer.concat([readBuffer, chunk])
  for (const msg of parseMessages()) handleMessage(msg)
})

process.stdin.resume()
