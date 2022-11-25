import {
  Box,
  Container,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  Text,
} from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/router";
import { AiOutlineMenu } from "react-icons/ai";
import { FaGithub } from "react-icons/fa";
import { MdArticle } from "react-icons/md";

import { Head } from "@/components/Head";
import { useIsSignedIn } from "@/hooks/useIsSignedIn";

import configJsonFile from "../../../config.json";

export interface LayoutProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ isLoading, children }) => {
  const router = useRouter();
  const { isSignedIn } = useIsSignedIn();

  return (
    <Flex minHeight={"100vh"} direction={"column"} bg={configJsonFile.style.color.black.bg}>
      <Head />
      {isLoading && (
        <Box position={"absolute"} w="full">
          <Progress size="xs" isIndeterminate colorScheme={"brand"} />
        </Box>
      )}
      <Container as="section" maxW="8xl">
        <Box as="nav" py="4">
          <HStack justify="space-between" alignItems={"center"} h="12">
            <Link href="/">
              <Image src={"/assets/icon.png"} alt="logo" h="8" rounded={configJsonFile.style.radius} />
            </Link>
            <HStack>
              <ConnectButton accountStatus={"address"} showBalance={false} chainStatus={"icon"} />
              {isSignedIn && (
                <Menu>
                  <MenuButton as={IconButton} aria-label="Options" icon={<AiOutlineMenu />} variant="outline" />
                  <MenuList>
                    <MenuItem onClick={() => router.push("/")}>Main</MenuItem>
                    <MenuItem onClick={() => router.push("/social-recovery")}>Social Recovery</MenuItem>
                    <MenuItem onClick={() => router.push("/web3-shortcut")}>Web3 Shortcut</MenuItem>
                  </MenuList>
                </Menu>
              )}
            </HStack>
          </HStack>
        </Box>
      </Container>
      <Container maxW="lg" flex={1}>
        {children}
      </Container>
      <Container maxW="8xl">
        <Box as="nav" py="4">
          <HStack justify={"space-between"}>
            <Text fontSize={"xs"} color={configJsonFile.style.color.white.text.secondary} fontWeight={"medium"}>
              <Text as="span" mr="2">
                😘
              </Text>
              Built in{" "}
              <Link href={configJsonFile.url.hackathon} target={"_blank"}>
                ETHVietnam
              </Link>
            </Text>
            <HStack spacing={"4"}>
              <Link href={configJsonFile.url.docs} target={"_blank"}>
                <Icon
                  as={MdArticle}
                  aria-label="article"
                  color={configJsonFile.style.color.white.text.secondary}
                  w={6}
                  h={6}
                />
              </Link>
              <Link href={configJsonFile.url.github} target={"_blank"}>
                <Icon
                  as={FaGithub}
                  aria-label="github"
                  color={configJsonFile.style.color.white.text.secondary}
                  w={6}
                  h={6}
                />
              </Link>
            </HStack>
          </HStack>
        </Box>
      </Container>
    </Flex>
  );
};
