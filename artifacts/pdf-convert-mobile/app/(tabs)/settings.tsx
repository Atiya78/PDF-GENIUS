import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Share, StyleSheet, Switch, Text, View } from "react-native";

import Svg, { Path } from "react-native-svg";

import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { Button, ScreenScroll } from "@/components/ui";
import colors from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import { cardShadow, fonts } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { avatarSrc } from "@/services/profile";

const PEOPLE_PATH =
  "M26.68,23.36a11,11,0,0,0-6.91-7.7,6,6,0,1,0-7.54,0,11,11,0,0,0-6.91,7.7,2.86,2.86,0,0,0,.54,2.47A3,3,0,0,0,8.25,27h15.5a3,3,0,0,0,2.39-1.17A2.86,2.86,0,0,0,26.68,23.36ZM12,11a4,4,0,1,1,4,4A4,4,0,0,1,12,11ZM24.56,24.6a1,1,0,0,1-.81.4H8.25a1,1,0,0,1-.81-.4.85.85,0,0,1-.18-.76,9,9,0,0,1,17.48,0A.85.85,0,0,1,24.56,24.6Z";

const C = colors.light;
const MOBILE_DATA_KEY = "pref_ask_mobile_data";
type FeatherName = keyof typeof Feather.glyphMap;

interface LinkRow {
  label: string;
  icon: FeatherName;
  onPress: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, user, token, signout } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const go = (r: string) => router.push(r as never);

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Your account";
  const photo = avatarSrc(user?.profilePictureUrl);

  const [askMobileData, setAskMobileData] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(MOBILE_DATA_KEY).then((v) => {
      if (v !== null) setAskMobileData(v === "true");
    });
  }, []);

  const toggleMobileData = (value: boolean) => {
    setAskMobileData(value);
    AsyncStorage.setItem(MOBILE_DATA_KEY, String(value)).catch(() => {});
  };

  const restorePurchases = () =>
    Alert.alert("Restore Purchases", "No previous purchases were found on this account.");

  const shareApp = async () => {
    try {
      await Share.share({
        message: "Convert, scan and organize PDFs on the go with PDF Genius.",
      });
    } catch {
      // user dismissed
    }
  };

  const moreLinks: LinkRow[] = [
    { label: "My Credits", icon: "zap", onPress: () => go(ROUTES.credits) },
    { label: "Terms & Conditions", icon: "file-text", onPress: () => go(ROUTES.terms) },
    { label: "Privacy Policy", icon: "shield", onPress: () => go(ROUTES.privacy) },
    { label: "Account & data deletion", icon: "user-x", onPress: () => Linking.openURL("https://pdfgenius.app/delete-account") },
    { label: "About us", icon: "info", onPress: () => go(ROUTES.about) },
    { label: "Help & Contact", icon: "life-buoy", onPress: () => go(ROUTES.contact) },
    { label: "Share App", icon: "share-2", onPress: shareApp },
  ];

  return (
    <ScreenScroll navInset tabBar>
      {/* Profile header */}
      {isAuthenticated ? (
        <Pressable
          onPress={() => go(ROUTES.profileSettings)}
          style={({ pressed }) => [styles.profileCard, cardShadow, { opacity: pressed ? 0.94 : 1 }]}
          testID="button-profile-header"
        >
          <View style={styles.profileAvatar}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.profileAvatarImg} contentFit="cover" />
            ) : (
              <Svg width={30} height={30} viewBox="0 0 32 32">
                <Path d={PEOPLE_PATH} fill="#fff" />
              </Svg>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            {!!user?.email && (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user.email}
              </Text>
            )}
          </View>
          <Feather name="chevron-right" size={20} color={C.mutedForeground} />
        </Pressable>
      ) : null}

      {/* Get Premium banner */}
      <Pressable onPress={() => go(ROUTES.pricing)} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
        <LinearGradient
          colors={[C.blue600, C.blue900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.premium, cardShadow]}
        >
          <View style={styles.premiumIcon}>
            <Feather name="award" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Get Premium</Text>
            <Text style={styles.premiumSub}>Unlimited conversions, no ads, priority speed.</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Account */}
      {isAuthenticated && (
        <>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={[styles.group, cardShadow]}>
            <SettingRow
              icon="user"
              label="Profile Settings"
              onPress={() => go(ROUTES.profileSettings)}
            />
            <SettingRow icon="trash-2" label="Delete account" onPress={() => setDeleteOpen(true)} divider />
          </View>
          <DeleteAccountModal
            visible={deleteOpen}
            token={token}
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => {
              setDeleteOpen(false);
              signout();
              Alert.alert("Account deleted", "Your PDF Genius account and its data have been deleted.");
            }}
          />
        </>
      )}

      {/* Purchases */}
      <Text style={styles.sectionTitle}>Purchases</Text>
      <View style={[styles.group, cardShadow]}>
        <SettingRow icon="shopping-bag" label="Purchases" onPress={() => go(ROUTES.managePlans)} />
        <SettingRow icon="help-circle" label="Payments & Billing Help" onPress={() => go(ROUTES.billingHelp)} divider />
        <SettingRow icon="refresh-cw" label="Restore Purchases" onPress={restorePurchases} divider />
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={[styles.group, cardShadow]}>
        <View style={styles.toggleRow}>
          <View style={styles.linkIcon}>
            <Feather name="wifi" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkLabel}>Ask before using mobile data</Text>
            <Text style={styles.linkSub}>Confirm before uploading on a cellular connection.</Text>
          </View>
          <Switch
            value={askMobileData}
            onValueChange={toggleMobileData}
            trackColor={{ false: C.border, true: C.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Developer */}
      {isAuthenticated && (
        <>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={[styles.group, cardShadow]}>
            <SettingRow icon="key" label="API Keys" onPress={() => go(ROUTES.apiSetup)} />
          </View>
        </>
      )}

      {/* More */}
      <Text style={styles.sectionTitle}>More</Text>
      <View style={[styles.group, cardShadow]}>
        {moreLinks.map((row, i) => (
          <SettingRow
            key={row.label}
            icon={row.icon}
            label={row.label}
            onPress={row.onPress}
            divider={i > 0}
          />
        ))}
      </View>

      <Text style={styles.version}>PDF Genius · Mobile · v1.0.0</Text>
    </ScreenScroll>
  );
}

function SettingRow({
  icon,
  label,
  onPress,
  divider,
}: {
  icon: FeatherName;
  label: string;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        divider && styles.linkDivider,
        { backgroundColor: pressed ? C.muted : "transparent" },
      ]}
    >
      <View style={styles.linkIcon}>
        <Feather name={icon} size={18} color={C.primary} />
      </View>
      <Text style={[styles.linkLabel, { flex: 1 }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={C.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  premium: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
  },
  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 22,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  profileName: { fontSize: 18, color: C.foreground, fontFamily: fonts.headingSemibold },
  profileEmail: { fontSize: 13, color: C.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
  premiumTitle: { fontSize: 17, color: "#fff", fontFamily: fonts.headingBold },
  premiumSub: { fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontFamily: fonts.body, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.foreground,
    fontFamily: fonts.headingSemibold,
    marginBottom: 10,
  },
  group: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  linkDivider: { borderTopWidth: 1, borderTopColor: C.border },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: { fontSize: 15, color: C.foreground, fontFamily: fonts.bodyMedium },
  linkSub: { fontSize: 12, color: C.mutedForeground, fontFamily: fonts.body, marginTop: 1 },
  version: {
    fontSize: 12,
    color: C.mutedForeground,
    fontFamily: fonts.body,
    textAlign: "center",
    marginTop: 6,
  },
});
