function normalizeParentPid(process) {
  const parentPid = Number(process?.parent_pid ?? 0);
  return Number.isFinite(parentPid) ? parentPid : 0;
}

function normalizeMetric(value) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function compareProcesses(left, right, sort = 'cpu_desc') {
  const normalizedSort = String(sort || 'cpu_desc').toLowerCase();

  if (normalizedSort === 'memory_desc') {
    return (right.memory_mb ?? 0) - (left.memory_mb ?? 0)
      || (right.cpu_percent ?? 0) - (left.cpu_percent ?? 0)
      || (left.pid ?? 0) - (right.pid ?? 0);
  }

  if (normalizedSort === 'name_asc') {
    return String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' })
      || (left.pid ?? 0) - (right.pid ?? 0);
  }

  if (normalizedSort === 'pid_asc') {
    return (left.pid ?? 0) - (right.pid ?? 0);
  }

  if (normalizedSort === 'status_asc') {
    return String(left.status || '').localeCompare(String(right.status || ''), undefined, { sensitivity: 'base' })
      || String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' })
      || (left.pid ?? 0) - (right.pid ?? 0);
  }

  return (right.cpu_percent ?? 0) - (left.cpu_percent ?? 0)
    || (right.memory_mb ?? 0) - (left.memory_mb ?? 0)
    || (left.pid ?? 0) - (right.pid ?? 0);
}

export function buildVisibleProcessTree(processes, { sort = 'cpu_desc', filterFn = () => true } = {}) {
  const allProcesses = Array.isArray(processes)
    ? processes.filter((process) => Number.isFinite(Number(process?.pid)))
    : [];

  const byPid = new Map(allProcesses.map((process) => [Number(process.pid), process]));
  const directlyVisibleIds = new Set(
    allProcesses
      .filter((process) => filterFn(process))
      .map((process) => Number(process.pid))
  );
  const includedIds = new Set(directlyVisibleIds);

  directlyVisibleIds.forEach((pid) => {
    let current = byPid.get(pid);
    const seen = new Set();

    while (current) {
      const currentPid = Number(current.pid);
      const parentPid = normalizeParentPid(current);
      if (!parentPid || parentPid === currentPid || seen.has(parentPid)) {
        break;
      }

      const parent = byPid.get(parentPid);
      if (!parent) {
        break;
      }

      includedIds.add(parentPid);
      seen.add(parentPid);
      current = parent;
    }
  });

  const includedProcesses = allProcesses.filter((process) => includedIds.has(Number(process.pid)));
  const sortedProcesses = [...includedProcesses].sort((left, right) => compareProcesses(left, right, sort));
  const childrenByParent = new Map();

  sortedProcesses.forEach((process) => {
    const parentPid = normalizeParentPid(process);
    if (!childrenByParent.has(parentPid)) {
      childrenByParent.set(parentPid, []);
    }
    childrenByParent.get(parentPid).push(process);
  });

  function buildNode(process, level = 0, lineage = new Set()) {
    const processPid = Number(process.pid);
    const nextLineage = new Set(lineage);
    nextLineage.add(processPid);
    const children = (childrenByParent.get(processPid) || [])
      .filter((child) => !nextLineage.has(Number(child.pid)))
      .map((child) => buildNode(child, level + 1, nextLineage));
    const descendantCount = children.reduce((sum, child) => sum + 1 + child.descendantCount, 0);
    const ownCpuPercent = normalizeMetric(process.cpu_percent);
    const ownMemoryMb = normalizeMetric(process.memory_mb);
    const aggregateCpuPercent = children.reduce((sum, child) => sum + child.aggregateCpuPercent, ownCpuPercent);
    const aggregateMemoryMb = children.reduce((sum, child) => sum + child.aggregateMemoryMb, ownMemoryMb);

    return {
      process,
      level,
      directMatch: directlyVisibleIds.has(processPid),
      children,
      descendantCount,
      groupSize: descendantCount + 1,
      ownCpuPercent,
      ownMemoryMb,
      aggregateCpuPercent,
      aggregateMemoryMb,
    };
  }

  const roots = sortedProcesses
    .filter((process) => {
      const parentPid = normalizeParentPid(process);
      return !parentPid || parentPid === Number(process.pid) || !includedIds.has(parentPid);
    })
    .map((process) => buildNode(process));

  return roots;
}

export function flattenProcessTree(nodes, expandedIds = new Set(), autoExpand = false) {
  const rows = [];

  const visit = (node) => {
    rows.push(node);
    const expanded = autoExpand || expandedIds.has(Number(node.process.pid));
    if (node.children.length && expanded) {
      node.children.forEach(visit);
    }
  };

  nodes.forEach(visit);
  return rows;
}

export function collectExpandableProcessIds(nodes) {
  const ids = [];

  const visit = (node) => {
    if (node.children.length) {
      ids.push(Number(node.process.pid));
      node.children.forEach(visit);
    }
  };

  nodes.forEach(visit);
  return ids;
}
