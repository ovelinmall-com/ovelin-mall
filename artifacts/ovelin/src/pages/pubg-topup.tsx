import { Redirect } from "wouter";

/** Keep old bookmarks working while PUBG uses the shared game storefront. */
export default function PubgTopup() {
  return <Redirect to="/game/pubg" />;
}