/**
 * DM Pairing Service
 *
 * Implements security for direct messages from untrusted senders.
 * When dmPolicy is "pairing", new senders must verify with a pairing code
 * before their messages are processed.
 *
 * Flow:
 * 1. Unknown sender sends message
 * 2. Agent responds with a pairing code
 * 3. User confirms code through a trusted channel (e.g., web UI)
 * 4. Sender is approved and messages flow through
 */

import { createLogger } from "../utils/logger.js";

const logger = createLogger("dm-pairing");

/**
 * Pairing request status
 */
export type PairingStatus = "pending" | "approved" | "rejected" | "expired";

/**
 * Pairing request record
 */
export interface PairingRequest {
  /** Unique pairing ID */
  id: string;
  /** Sender identifier from channel */
  senderId: string;
  /** Channel type (graph, dataverse, etc.) */
  channel: string;
  /** Human-readable sender name if available */
  senderName?: string;
  /** Sender email if available */
  senderEmail?: string;
  /** 6-digit pairing code */
  code: string;
  /** Request status */
  status: PairingStatus;
  /** When the request was created */
  createdAt: Date;
  /** When the request expires */
  expiresAt: Date;
  /** When the request was approved/rejected */
  resolvedAt?: Date;
  /** First message content from the sender */
  initialMessage?: string;
}

/**
 * Approved sender record
 */
export interface ApprovedSender {
  /** Sender identifier */
  senderId: string;
  /** Channel type */
  channel: string;
  /** When approval was granted */
  approvedAt: Date;
  /** Who approved (user ID) */
  approvedBy?: string;
  /** Optional notes */
  notes?: string;
}

/**
 * Pairing service configuration
 */
export interface PairingConfig {
  /** Code expiration time in minutes (default: 15) */
  codeExpirationMinutes?: number;
  /** Maximum pending requests per sender (default: 3) */
  maxPendingPerSender?: number;
  /** Callback when new pairing request is created */
  onPairingRequest?: (request: PairingRequest) => void;
}

/**
 * Pairing service interface
 */
export interface PairingService {
  /** Check if a sender is approved */
  isApproved(senderId: string, channel: string): boolean;

  /** Create a pairing request for a new sender */
  createPairingRequest(
    senderId: string,
    channel: string,
    options?: {
      senderName?: string;
      senderEmail?: string;
      initialMessage?: string;
    }
  ): PairingRequest;

  /** Verify a pairing code */
  verifyCode(senderId: string, channel: string, code: string): boolean;

  /** Approve a sender (admin action) */
  approve(senderId: string, channel: string, approvedBy?: string): void;

  /** Reject a pairing request */
  reject(senderId: string, channel: string): void;

  /** Get pending requests for review */
  getPendingRequests(): PairingRequest[];

  /** Get approved senders */
  getApprovedSenders(): ApprovedSender[];

  /** Revoke approval for a sender */
  revoke(senderId: string, channel: string): void;

  /** Clean up expired requests */
  cleanupExpired(): number;
}

/**
 * Generate a 6-digit pairing code
 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique pairing request ID
 */
function generateId(): string {
  return `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create an in-memory pairing service
 */
export function createPairingService(config: PairingConfig = {}): PairingService {
  const pendingRequests = new Map<string, PairingRequest>();
  const approvedSenders = new Map<string, ApprovedSender>();

  const expirationMs = (config.codeExpirationMinutes ?? 15) * 60 * 1000;
  const maxPending = config.maxPendingPerSender ?? 3;

  /**
   * Create a composite key for sender+channel
   */
  const makeKey = (senderId: string, channel: string): string =>
    `${channel}:${senderId}`;

  return {
    isApproved(senderId: string, channel: string): boolean {
      return approvedSenders.has(makeKey(senderId, channel));
    },

    createPairingRequest(
      senderId: string,
      channel: string,
      options: {
        senderName?: string;
        senderEmail?: string;
        initialMessage?: string;
      } = {}
    ): PairingRequest {
      const key = makeKey(senderId, channel);

      // Check for existing pending request
      const existing = pendingRequests.get(key);
      if (existing && existing.status === "pending" && existing.expiresAt > new Date()) {
        logger.debug(`Returning existing pairing request for ${key}`);
        return existing;
      }

      // Count pending requests for this sender
      let pendingCount = 0;
      for (const req of pendingRequests.values()) {
        if (req.senderId === senderId && req.status === "pending") {
          pendingCount++;
        }
      }

      if (pendingCount >= maxPending) {
        throw new Error(`Too many pending pairing requests for sender ${senderId}`);
      }

      // Create new request
      const now = new Date();
      const request: PairingRequest = {
        id: generateId(),
        senderId,
        channel,
        senderName: options.senderName,
        senderEmail: options.senderEmail,
        code: generateCode(),
        status: "pending",
        createdAt: now,
        expiresAt: new Date(now.getTime() + expirationMs),
        initialMessage: options.initialMessage,
      };

      pendingRequests.set(key, request);
      logger.info(`Created pairing request ${request.id} for ${key}, code: ${request.code}`);

      // Notify callback if configured
      if (config.onPairingRequest) {
        config.onPairingRequest(request);
      }

      return request;
    },

    verifyCode(senderId: string, channel: string, code: string): boolean {
      const key = makeKey(senderId, channel);
      const request = pendingRequests.get(key);

      if (!request) {
        logger.warn(`No pairing request found for ${key}`);
        return false;
      }

      if (request.status !== "pending") {
        logger.warn(`Pairing request ${request.id} is not pending (${request.status})`);
        return false;
      }

      if (new Date() > request.expiresAt) {
        request.status = "expired";
        logger.warn(`Pairing request ${request.id} has expired`);
        return false;
      }

      if (request.code !== code) {
        logger.warn(`Invalid code for pairing request ${request.id}`);
        return false;
      }

      // Code is valid - approve the sender
      request.status = "approved";
      request.resolvedAt = new Date();

      approvedSenders.set(key, {
        senderId,
        channel,
        approvedAt: request.resolvedAt,
        notes: `Verified via pairing code`,
      });

      logger.info(`Pairing verified for ${key}, sender approved`);
      return true;
    },

    approve(senderId: string, channel: string, approvedBy?: string): void {
      const key = makeKey(senderId, channel);

      // Mark any pending request as approved
      const request = pendingRequests.get(key);
      if (request && request.status === "pending") {
        request.status = "approved";
        request.resolvedAt = new Date();
      }

      // Add to approved senders
      approvedSenders.set(key, {
        senderId,
        channel,
        approvedAt: new Date(),
        approvedBy,
        notes: `Manually approved${approvedBy ? ` by ${approvedBy}` : ""}`,
      });

      logger.info(`Manually approved sender ${key}${approvedBy ? ` by ${approvedBy}` : ""}`);
    },

    reject(senderId: string, channel: string): void {
      const key = makeKey(senderId, channel);
      const request = pendingRequests.get(key);

      if (request && request.status === "pending") {
        request.status = "rejected";
        request.resolvedAt = new Date();
        logger.info(`Rejected pairing request for ${key}`);
      }
    },

    getPendingRequests(): PairingRequest[] {
      const pending: PairingRequest[] = [];
      const now = new Date();

      for (const request of pendingRequests.values()) {
        if (request.status === "pending") {
          // Check if expired
          if (now > request.expiresAt) {
            request.status = "expired";
          } else {
            pending.push(request);
          }
        }
      }

      return pending;
    },

    getApprovedSenders(): ApprovedSender[] {
      return Array.from(approvedSenders.values());
    },

    revoke(senderId: string, channel: string): void {
      const key = makeKey(senderId, channel);
      if (approvedSenders.delete(key)) {
        logger.info(`Revoked approval for sender ${key}`);
      }
    },

    cleanupExpired(): number {
      const now = new Date();
      let cleaned = 0;

      for (const [key, request] of pendingRequests.entries()) {
        if (request.status === "pending" && now > request.expiresAt) {
          request.status = "expired";
          cleaned++;
        }
        // Remove old resolved/expired requests (older than 24h)
        if (
          request.status !== "pending" &&
          request.resolvedAt &&
          now.getTime() - request.resolvedAt.getTime() > 24 * 60 * 60 * 1000
        ) {
          pendingRequests.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`Cleaned up ${cleaned} expired/old pairing requests`);
      }

      return cleaned;
    },
  };
}

/**
 * Generate a user-friendly pairing message
 */
export function generatePairingMessage(request: PairingRequest): string {
  return `Hi! I don't recognize you yet. To start chatting, please verify with this code:

**${request.code}**

Enter this code in the PowerHoof dashboard, or ask an admin to approve you.

This code expires in ${Math.round((request.expiresAt.getTime() - Date.now()) / 60000)} minutes.`;
}
