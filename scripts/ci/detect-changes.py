#!/usr/bin/env python3
"""
Detect which services need to be rebuilt based on changed files
Uses the service-manifest.yaml to determine dependencies
"""

import os
import sys
import json
import yaml
import subprocess
from pathlib import Path
from typing import Set, List, Dict, Any

def load_manifest() -> Dict[str, Any]:
    """Load the service manifest file"""
    manifest_path = Path(__file__).parent.parent.parent / "ci" / "service-manifest.yaml"
    if not manifest_path.exists():
        print(f"Error: Service manifest not found at {manifest_path}", file=sys.stderr)
        sys.exit(1)
    
    with open(manifest_path, "r") as f:
        return yaml.safe_load(f)

def get_changed_files(base_ref: str = "origin/main") -> Set[str]:
    """Get list of changed files compared to base branch"""
    try:
        # Get the merge base to handle different branch scenarios
        merge_base = subprocess.check_output(
            ["git", "merge-base", base_ref, "HEAD"],
            text=True
        ).strip()
        
        # Get changed files
        result = subprocess.check_output(
            ["git", "diff", "--name-only", merge_base],
            text=True
        )
        return set(result.strip().split("\n")) if result.strip() else set()
    except subprocess.CalledProcessError as e:
        print(f"Error getting changed files: {e}", file=sys.stderr)
        return set()

def match_triggers(changed_files: Set[str], triggers: List[str]) -> bool:
    """Check if any changed file matches the trigger patterns"""
    for changed_file in changed_files:
        for trigger in triggers:
            # Handle wildcard patterns
            if "**" in trigger:
                # Convert ** to match any path depth
                pattern = trigger.replace("**", ".*")
                import re
                if re.match(pattern, changed_file):
                    return True
            elif trigger.endswith("/**"):
                # Directory prefix match
                dir_prefix = trigger[:-3]  # Remove /**
                if changed_file.startswith(dir_prefix + "/"):
                    return True
            elif trigger == changed_file:
                # Exact match
                return True
    return False

def get_services_to_build(changed_files: Set[str], manifest: Dict[str, Any]) -> Set[str]:
    """Determine which services need to be rebuilt based on changed files"""
    services_to_build = set()
    
    # Check each service's triggers
    for service_name, service_config in manifest.get("services", {}).items():
        triggers = service_config.get("triggers", [])
        if match_triggers(changed_files, triggers):
            services_to_build.add(service_name)
    
    # Check infrastructure triggers (triggers all services)
    infra_triggers = manifest.get("infrastructure", {}).get("triggers", [])
    if match_triggers(changed_files, infra_triggers):
        # All services need to be rebuilt
        services_to_build.update(manifest.get("services", {}).keys())
    
    # Add dependent services
    services_with_deps = services_to_build.copy()
    for service in services_to_build:
        services_with_deps.update(get_dependent_services(service, manifest))
    
    return services_with_deps

def get_dependent_services(service: str, manifest: Dict[str, Any]) -> Set[str]:
    """Get all services that depend on the given service"""
    dependents = set()
    services = manifest.get("services", {})
    
    for other_service, config in services.items():
        if service in config.get("depends_on", []):
            dependents.add(other_service)
            # Recursively get dependents of dependents
            dependents.update(get_dependent_services(other_service, manifest))
    
    return dependents

def check_frontend_changes(changed_files: Set[str], manifest: Dict[str, Any]) -> bool:
    """Check if frontend needs to be rebuilt"""
    frontend_triggers = manifest.get("frontend", {}).get("triggers", [])
    return match_triggers(changed_files, frontend_triggers)

def get_build_order(services: Set[str], manifest: Dict[str, Any]) -> List[str]:
    """Sort services by their deploy_order for optimal build sequence"""
    service_configs = manifest.get("services", {})
    service_list = []
    
    for service in services:
        if service in service_configs:
            order = service_configs[service].get("deploy_order", 99)
            service_list.append((order, service))
    
    # Sort by deploy_order
    service_list.sort(key=lambda x: x[0])
    return [s[1] for s in service_list]

def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Detect services that need rebuilding")
    parser.add_argument("--base-ref", default="origin/main", help="Base reference for comparison")
    parser.add_argument("--format", choices=["json", "list", "github"], default="json",
                        help="Output format")
    parser.add_argument("--include-frontend", action="store_true",
                        help="Include frontend in the output")
    args = parser.parse_args()
    
    # Load manifest
    manifest = load_manifest()
    
    # Get changed files
    changed_files = get_changed_files(args.base_ref)
    
    if not changed_files:
        print("No changes detected", file=sys.stderr)
        if args.format == "json":
            print(json.dumps({"services": [], "frontend": False}))
        elif args.format == "github":
            print("[]")
        sys.exit(0)
    
    # Determine services to build
    services_to_build = get_services_to_build(changed_files, manifest)
    frontend_changed = check_frontend_changes(changed_files, manifest)
    
    # Sort services by build order
    ordered_services = get_build_order(services_to_build, manifest)
    
    # Output results
    if args.format == "json":
        output = {
            "services": ordered_services,
            "frontend": frontend_changed,
            "changed_files_count": len(changed_files)
        }
        print(json.dumps(output, indent=2))
    elif args.format == "list":
        for service in ordered_services:
            print(service)
        if args.include_frontend and frontend_changed:
            print("frontend")
    elif args.format == "github":
        # GitHub Actions matrix format
        if ordered_services:
            print(json.dumps(ordered_services))
        else:
            print("[]")
    
    # Exit with status indicating if anything needs building
    sys.exit(0 if (ordered_services or frontend_changed) else 1)

if __name__ == "__main__":
    main()