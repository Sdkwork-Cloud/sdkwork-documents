const mode = process.argv[2] ?? "dev";

if (mode === "lint") {
  process.stdout.write("sdkwork-documents-pc lint scaffold ok\n");
  process.exit(0);
}

process.stdout.write(
  `sdkwork-documents-pc ${mode} scaffold: implement browser/desktop UI per APP_PC_ARCHITECTURE_SPEC.md\n`,
);
