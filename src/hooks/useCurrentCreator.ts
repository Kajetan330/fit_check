import { useEffect, useState } from "react";
import { creators } from "../data";
import { demoMode, useAppState } from "../state";
import type { Creator } from "../types";
import { mapCreatorRow } from "../lib/repositories/mappers";
import { supabase } from "../lib/supabase";

export type CurrentCreatorState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "not_creator" }
  | { status: "no_profile" }
  | { status: "ready"; creator: Creator; creatorProfileId: string };

export const DEMO_CREATOR_ID = creators[0].id;

export function useCurrentCreator(): CurrentCreatorState {
  const { state } = useAppState();
  const [result, setResult] = useState<CurrentCreatorState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (demoMode && state.user?.role === "creator" && !state.user.supabaseId) {
        setResult({ status: "ready", creator: creators[0], creatorProfileId: DEMO_CREATOR_ID });
        return;
      }

      if (!supabase || !state.user?.supabaseId) {
        setResult({ status: "signed_out" });
        return;
      }

      if (state.user.role !== "creator" && state.user.role !== "admin") {
        setResult({ status: "not_creator" });
        return;
      }

      const { data, error } = await supabase
        .from("creator_profiles")
        .select("*, services(*)")
        .eq("user_id", state.user.supabaseId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setResult({ status: "no_profile" });
        return;
      }

      setResult({ status: "ready", creator: mapCreatorRow(data), creatorProfileId: data.id });
    }

    setResult({ status: "loading" });
    void load();

    return () => {
      cancelled = true;
    };
  }, [state.user?.role, state.user?.supabaseId]);

  return result;
}
