/**
 * Network configuration and management
 */

export {
  sepoliaNetwork,
  arbitrumSepoliaNetwork,
  supportedNetworks,
  defaultNetwork,
  getNetworkByChainId,
  getNetworkByName,
} from "./supported-networks";

export { NetworkManager, type NetworkManagerConfig, type NetworkChangeListener } from "./network-manager";
