import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { deleteAccount } from "@/services/accountDeletion";

const C = colors.light;

/** Typed "DELETE" confirmation, then permanent account deletion. */
export function DeleteAccountModal({ visible, token, onClose, onDeleted }: { visible: boolean; token: string | null; onClose: () => void; onDeleted: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = text.trim() === "DELETE" && !!token && !busy;

  const close = () => { if (busy) return; setText(""); setError(null); onClose(); };
  const confirm = async () => {
    if (!ready || !token) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(token);
      setText("");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't delete your account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Delete account</Text>
          <Text style={styles.body}>
            This permanently deletes your account, saved conversions, API keys, credits and Education data. It can't be undone.
            Cancel any paid subscription first.
          </Text>
          <Text style={styles.label}>Type DELETE to confirm</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor={C.mutedForeground}
            style={styles.input}
            editable={!busy}
            testID="input-delete-confirm"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.row}>
            <Pressable onPress={close} style={[styles.btn, styles.ghost]} disabled={busy}>
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} style={[styles.btn, styles.danger, !ready && { opacity: 0.5 }]} disabled={!ready} testID="button-delete-account-confirm">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerText}>Delete forever</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  title: { fontFamily: fonts.headingSemibold, fontSize: 18, color: C.foreground },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: C.mutedForeground, marginTop: 8 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 13, color: C.foreground, marginTop: 16 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, height: 46, marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 15, color: C.foreground },
  error: { fontFamily: fonts.body, fontSize: 13, color: "#b42318", marginTop: 10 },
  row: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: { flex: 1, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ghost: { borderWidth: 1, borderColor: C.border },
  ghostText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: C.foreground },
  danger: { backgroundColor: "#b42318" },
  dangerText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: "#fff" },
});
