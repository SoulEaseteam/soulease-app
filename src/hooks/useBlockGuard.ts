// src/hooks/useBlockGuard.ts
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  getDeviceAndIp,
  isDeviceBlocked,
  isIpBlocked,
  blockDeviceAndIp,
  type BlockReason,
  type BlockContext,
} from "@/utils/blocking";

interface UseBlockGuardResult {
  deviceId: string | null;
  ip: string | null;
  blockMe: (reason: BlockReason, ctx?: BlockContext) => Promise<void>;
  checking: boolean;
  blocked: boolean;
}


export function useBlockGuard(pageTag: string): UseBlockGuardResult {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = useUserRole(); // "admin" | "therapist" | "customer" | undefined
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { deviceId: d, ip: ipAddr } = await getDeviceAndIp();
        if (cancelled) return;

        setDeviceId(d);
        setIp(ipAddr);

        const [devBlocked, ipBlocked] = await Promise.all([
          isDeviceBlocked(d),
          isIpBlocked(ipAddr),
        ]);

        if (devBlocked || ipBlocked) {
          setBlocked(true);
          navigate("/blocked", { replace: true });
        }
      } catch (err) {
        console.error("BlockGuard check failed:", err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const blockMe = useCallback(
    async (reason: BlockReason, ctx?: BlockContext) => {
      // 👑 ถ้าเป็น admin / owner → ห้าม block ตัวเอง
      if (role === "admin") {
        console.log("Admin is exempt from auto-block.");
        return;
      }

      if (!deviceId) return;

      try {
        await blockDeviceAndIp({
          deviceId,
          ip,
          reason,
          context: { ...(ctx || {}), page: pageTag },
        });
        setBlocked(true);
        navigate("/blocked", { replace: true });
      } catch (err) {
        console.error("blockMe failed:", err);
      }
    },
    [deviceId, ip, navigate, pageTag, role]
  );

  return { deviceId, ip, blockMe, checking, blocked };
}