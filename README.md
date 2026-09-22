CCSC Helper for VS Code
[!important]
JP only

This code is incomplete, so please contact us if you find any issues.

A VS Code extension that provides build tasks and IntelliSense for the CCSC compiler.
The extension ID is user.vscode-extension-for-ccsc.

Main Features
This extension currently provides the following features:

Automatic Recognition of CCSC Projects

If a .ccspjt file exists in the workspace, it is automatically recognized as a CCSC project, and necessary settings are enabled.

Enhanced IntelliSense

Automatic Addition of Type Definitions: Automatically defines CCSC-specific types (int8, boolean, BYTE, etc.) in IntelliSense. This suppresses many incorrect error displays caused by types not found in standard C.

Automatic Include Path Configuration: Automatically configures include paths for CCSC Devices and Drivers folders, ensuring that device header files (e.g., 18F67J94.h) and standard driver libraries are recognized correctly.

Compiler Type Determination: Analyzes the project file (.ccspjt) to identify the compiler used (PCH or PCM). Automatically adds definitions like __PCH__=1 to provide compiler-appropriate IntelliSense.

Provision of Build Tasks

Automatically generates a build task that runs ccscompile.exe based on information from the .ccspjt file.

Simply run Tasks: Run Build Task (Ctrl+Shift+B) from the VS Code command palette to easily compile the project.

Includes memory usage display and an automatic deletion feature for unnecessary files after building.

Flash (Programming) Function ※Requires MPLAB X IDE + Programmer

Provides HEX file programming functionality using MPLAB IPECMD (Java-based ipecmd.jar).

Supports various programmers such as PICkit 5, PICkit 4, and MPLAB Snap.

Allows direct Flash execution from status bar buttons, or Build & Flash (automatic programming after building).

Syntax Highlighting

Color-codes CCSC-specific directives such as #use and #fuses.

Requirements
Visual Studio Code

C/C++ Extension (provided by Microsoft)

CCSC (PIC C Compiler)

CCS C Compiler for PIC Microcontrollers

Note: The CCSC installation path can be changed via the ccscHelper.ccscInstallPath setting (Default: C:\Program Files (x86)\PICC).

MPLAB X IPE (When using the Flash feature)

Must include MPLAB IPE (Integrated Programming Environment).

Recommended Version: MPLAB X IDE v5.0 or later.

Example Installation Path: C:\Program Files\Microchip\MPLABX\v6.20\

Java Runtime Environment (JRE) 8 or later (When using the Flash feature)

Required for the Flash feature: Since MPLAB IPECMD is a Java-based application (ipecmd.jar), Java installation is required.

Note: If the java command is not included in your PATH environment variable, specify the Java executable path in the ccscHelper.flash.javaPath setting.

Additional Requirements (Recommended)
PIC Programmer (When using the Flash feature)

PICkit 5, PICkit 4, PICkit 3, MPLAB Snap, ICD4, ICD3, Real ICE, etc.

A programmer compatible with the target PIC device is required.

Usage
Open a Project: Open the folder containing the .ccspjt file in VS Code.

Automatic Setup: The extension automatically recognizes the project and configures IntelliSense.

Build: Press Ctrl+Shift+B and select Build CCSC Project from the displayed menu to compile the project.

Task Buttons: Execute tasks directly from the Build, Flash, and Build&Flash buttons displayed in the status bar.

Check Settings: This extension automatically sets the C/C++ configuration provider to CCSC Helper. You can select another provider from the C/C++ settings menu if needed.

Settings
You can modify the following settings in settings.json or through the VS Code settings screen:

Basic Settings
ccscHelper.ccscInstallPath: CCSC installation path (Default: C:\Program Files (x86)\PICC)

ccscHelper.compilerOptions: Compilation options passed to ccscompile.exe (Default: +FH +Ex)

Build Settings
ccscHelper.build.deleteUnnecessaryFiles: Patterns of unnecessary files to delete after build completion (Default: ["pc$.err"])

Flash (Programming) Settings
ccscHelper.flash.enabled: Enable the Flash feature (Default: true)

ccscHelper.flash.useJava: Use Java-based IPECMD (ipecmd.jar) (Default: true)

ccscHelper.flash.javaPath: Java executable path (Default: java)

ccscHelper.flash.toolPath: MPLAB IPE path (Default: Directory containing ipecmd.jar)

ccscHelper.flash.deviceId: PIC device ID (Default: 18F67J94)

ccscHelper.flash.programmer: Programmer type (Default: PK5)

Choices: PK5, PK4, PK3, SNAP, ICD4, ICD3, REALICE, SIMULATOR

ccscHelper.flash.voltage: Programming voltage (Default: 3.3)

Choices: 3.3, 5.0

ccscHelper.flash.extraArgs: Additional arguments (Default: -M)

IntelliSense Settings
ccscHelper.intellisense.enabled: Enable IntelliSense features (Default: true)

ccscHelper.intellisense.standard: C language standard (Default: c99)

ccscHelper.intellisense.mode: IntelliSense mode (Default: windows-clang-x86)

ccscHelper.intellisense.compilerArgs: Compiler arguments (warning suppression, etc.)

ccscHelper.intellisense.standardDefines: Standard definitions

ccscHelper.intellisense.modeDefines: Compile-mode specific definitions

ccscHelper.intellisense.compilerArguments: IntelliSense compiler arguments

ccscHelper.intellisense.customDefines: Custom definitions

ccscHelper.intellisense.customIncludePaths: Custom include paths

Live Linting Settings
ccscHelper.liveLinting.enabled: Enable Live Linting feature (Default: false)

ccscHelper.liveLinting.delay: Wait time after file save (Default: 500 ms)

ccscHelper.liveLinting.errorPattern: Regular expression pattern

Error Analysis Settings
ccscHelper.errorAnalysis.errorPattern: Regular expression for error analysis

ccscHelper.errorAnalysis.warningPattern: Regular expression for warning analysis

Example Configuration in MPLAB Environment
JSON
{
  "ccscHelper.flash.enabled": true,
  "ccscHelper.flash.useJava": true,
  "ccscHelper.flash.javaPath": "java",
  "ccscHelper.flash.toolPath": "C:\\Program Files\\Microchip\\MPLABX\\v6.20\\mplab_platform\\mplab_ipe",
  "ccscHelper.flash.deviceId": "18F67J94",
  "ccscHelper.flash.programmer": "PK5",
  "ccscHelper.flash.voltage": "3.3",
  "ccscHelper.flash.extraArgs": "-M"
}
Generated Command Examples
Bash
# Flash only
cd "C:\Program Files\Microchip\MPLABX\v6.20\mplab_platform\mplab_ipe"
java -jar ipecmd.jar -P18F67J94 -TPPK5 -W3.3 -F"C:\Code\main.hex" -M

# Build & Flash (Flash after building)
cd "C:\Code\MyProject"
"C:\Program Files (x86)\PICC\ccscompile.exe" +FH +Ex main.c
cd "C:\Program Files\Microchip\MPLABX\v6.20\mplab_platform\mplab_ipe"
java -jar ipecmd.jar -P18F67J94 -TPPK5 -W3.3 -F"C:\Code\MyProject\main.hex" -M
Troubleshooting
Java Environment Issues
If an error occurs indicating that Java is not found during the Flash operation:

Check if Java (JRE 8 or later) is installed

Run java -version in the command prompt.

If version information appears, Java is installed.

If Java is not recognized in VS Code

Open ccscHelper.flash.javaPath in VS Code settings.

Specify the absolute path to Java:

Plaintext
C:\Program Files\Java\jre1.8.0_XXX\bin\java.exe
Or specify the full path to the Java executable:

Plaintext
C:\Program Files\Eclipse Adoptium\jdk-11.0.XX-hotspot\bin\java.exe
Common Java Installation Paths

Plaintext
C:\Program Files\Java\jre1.8.0_XXX\bin\java.exe
C:\Program Files\Java\jdk-XX.X.X\bin\java.exe
C:\Program Files\Eclipse Adoptium\jdk-XX.X.X-hotspot\bin\java.exe
C:\Program Files\Microsoft\jdk-XX.X.X\bin\java.exe
Adding Java to the PATH Environment Variable

Open system environment variable settings.

Add C:\Program Files\Java\jre1.8.0_XXX\bin to the PATH variable.

Restart VS Code.

MPLAB X IDE Path Configuration
If you are using a different version of MPLAB X IDE, change the ccscHelper.flash.toolPath setting to the appropriate path:

Plaintext
C:\Program Files\Microchip\MPLABX\v6.XX\mplab_platform\mplab_ipe
If MPLAB X IDE Cannot Be Found
Verify MPLAB X IDE is installed

Download and install it from the Microchip Official Website.

Ensure that MPLAB IPE (Integrated Programming Environment) is also included.

Check the Installation Path

Standard installation path: C:\Program Files\Microchip\MPLABX\

Location of ipecmd.jar: C:\Program Files\Microchip\MPLABX\v6.XX\mplab_platform\mplab_ipe\ipecmd.jar

Check Programmer Connection

Ensure that the programmer (such as PICkit) is properly connected to the PC.

Verify that the device drivers are installed correctly.

Notes
You can change the CCSC installation path via the extension setting ccscHelper.ccscInstallPath.

While IntelliSense supports many CCSC-specific syntaxes, some special directives or inline assembly may not be interpreted correctly.

Release Notes
Refer to CHANGELOG.md for a complete history of changes.
