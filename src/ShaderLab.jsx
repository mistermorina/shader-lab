import { useState } from "react";
import FiltersWorkspace from "./FiltersWorkspace.jsx";
import AsciiWorkspace from "./AsciiWorkspace.jsx";

export default function ShaderLab() {
  const [workspaceMode, setWorkspaceMode] = useState("filters");

  return (
    <>
      <FiltersWorkspace
        hidden={workspaceMode !== "filters"}
        workspaceMode={workspaceMode}
        setWorkspaceMode={setWorkspaceMode}
      />
      <AsciiWorkspace
        hidden={workspaceMode !== "ascii"}
        workspaceMode={workspaceMode}
        setWorkspaceMode={setWorkspaceMode}
      />
    </>
  );
}
