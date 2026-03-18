import { Command } from "commander";
import { initCollab, createChannel, postMessage, readMessages, listChannelsWithStats } from "../../core/collab.js";
import { resolveProjectPath } from "../utils.js";

export const collabCommand = new Command("collab")
  .description("Agent collaboration channels and messaging");

collabCommand
  .command("init")
  .description("Initialize Collab for a project")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const { projectHubPath, slug } = await resolveProjectPath(options.project, options.hubPath);
    await initCollab(projectHubPath);
    console.log(`✓ Collab initialized for project: ${slug}`);
    console.log(`  Channel: #general created`);
  });

collabCommand
  .command("channels")
  .description("List channels")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (options) => {
    const { projectHubPath } = await resolveProjectPath(options.project, options.hubPath);
    const channels = await listChannelsWithStats(projectHubPath);
    if (!channels.length) {
      console.log("No channels. Run: agenthive collab init");
      return;
    }
    console.log("\nChannels:\n");
    for (const ch of channels) {
      const last = ch.lastMessage ? ` (last: ${ch.lastMessage.from} ${ch.lastMessage.ts.slice(0, 16)})` : "";
      console.log(`  #${ch.id}  ${ch.messageCount} msgs  ${ch.description}${last}`);
    }
    console.log("");
  });

collabCommand
  .command("channel")
  .description("Create a new channel")
  .argument("<id>", "Channel ID (kebab-case)")
  .argument("<description>", "Channel description")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (id, description, options) => {
    const { projectHubPath } = await resolveProjectPath(options.project, options.hubPath);
    await createChannel(projectHubPath, id, description);
    console.log(`✓ Channel #${id} created`);
  });

collabCommand
  .command("post")
  .description("Post a message to a channel")
  .argument("<channel>", "Channel ID")
  .argument("<message>", "Message content")
  .requiredOption("--from <agent>", "Agent ID (sender)")
  .option("-t, --type <type>", "Message type (message, proposal, question, ...)", "message")
  .option("--reply-to <id>", "Reply to message ID")
  .option("--refs <refs>", "Comma-separated references (task IDs, URLs)")
  .option("--tags <tags>", "Comma-separated tags")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (channel, message, options) => {
    const { projectHubPath } = await resolveProjectPath(options.project, options.hubPath);
    const result = await postMessage(projectHubPath, channel, options.from, message, {
      type: options.type,
      reply_to: options.replyTo,
      refs: options.refs ? options.refs.split(",").map((s: string) => s.trim()) : undefined,
      tags: options.tags ? options.tags.split(",").map((s: string) => s.trim()) : undefined,
    });
    console.log(`✓ [${result.id}] @${result.from} → #${channel}: ${message.slice(0, 60)}${message.length > 60 ? "..." : ""}`);
  });

collabCommand
  .command("tail")
  .description("Read recent messages from a channel")
  .argument("<channel>", "Channel ID")
  .option("-n, --last <count>", "Number of messages", "20")
  .option("--from <agent>", "Filter by agent")
  .option("--type <type>", "Filter by message type")
  .option("-p, --project <slug>", "Project slug")
  .option("--hub-path <path>", "Hub path")
  .action(async (channel, options) => {
    const { projectHubPath } = await resolveProjectPath(options.project, options.hubPath);
    const messages = await readMessages(projectHubPath, channel, {
      limit: parseInt(options.last, 10),
      from: options.from,
      type: options.type,
    });
    if (!messages.length) {
      console.log(`#${channel} — no messages`);
      return;
    }
    console.log(`\n#${channel} (${messages.length} messages)\n`);
    for (const m of messages) {
      const time = m.ts.slice(11, 16);
      const typeTag = m.type !== "message" ? ` [${m.type}]` : "";
      const replyTag = m.reply_to ? ` ↩ ${m.reply_to.slice(-12)}` : "";
      console.log(`  ${time}  @${m.from}${typeTag}${replyTag}`);
      console.log(`    ${m.content}`);
      if (m.refs.length) console.log(`    refs: ${m.refs.join(", ")}`);
      console.log("");
    }
  });
