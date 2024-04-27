<div align="center">
  <h1>nixf-tidy-action</code></h1>

  <p>
    <strong>Lint your .nix code on PRs, keep a clean codebase</strong>
  </p>
</div>


To use this in your repository, write `.github/workflows/nixf-tidy.yaml`


```yaml
name: nixf-tidy code linter

on:
  [ pull_request ]

jobs:
  nixf-tidy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false

    if: ${{ !contains(github.event.head_commit.message, '[skip ci]') }}
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
    - uses: actions/checkout@v3
    - uses: cachix/install-nix-action@v22
      with:
        github_access_token: ${{ secrets.GITHUB_TOKEN }}
        extra_nix_config: |
          trusted-public-keys = nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs= cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=
          substituters = https://nix-community.cachix.org https://cache.nixos.org/
    - run: nix profile install github:nix-community/nixd#nixd
    - uses: inclyc/nixf-tidy-action@v1
```


