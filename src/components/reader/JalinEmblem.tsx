/**
 * The Jalin emblem, drawn from public/brand/jalin-icon-color.svg (nine woven blades, original colours).
 * Each blade is wrapped on the emblem's centre (1042, 525) so CSS rotation turns it about the middle, not about the SVG origin.
 * With "animated" each blade joins in turn from its own direction of rotation, holds, then parts and joins again
 * (see .jalin-emblem in globals.css). Static, and with no motion at all under prefers-reduced-motion, otherwise.
 */
const BLADES: Array<{ fill: string; d: string }> = [
  {
    "fill": "rgb(19,47,56)",
    "d": "M 1069.33 333.003 L 1070.49 333.142 L 1070.95 334.366 C 1047.68 369.981 1023.62 399.755 988.756 425.008 C 921.518 473.705 821.151 488.869 788.007 574.481 C 778.967 597.831 779.024 618.329 784.65 642.319 C 778.175 635.812 774.174 630.686 768.525 623.519 C 760.481 611.349 755.663 603.09 750.779 588.799 C 739.816 557.314 741.85 522.758 756.43 492.775 C 765.629 474.302 779.842 457.212 796.648 445.1 C 827.893 422.584 867.847 408.607 902.874 392.332 C 934.387 377.69 966.119 362.043 998.976 351.359 C 1022.26 343.789 1045.95 340.958 1069.33 333.003 z"
  },
  {
    "fill": "rgb(19,47,56)",
    "d": "M 886.358 579.955 C 945.72 590.077 978.459 627.815 1020.61 666.251 C 1074.35 715.257 1146.45 773.462 1223.93 749.124 C 1216.01 755.756 1209.69 760.692 1201.29 766.711 C 1175.53 782.938 1145.46 790.991 1115.03 789.812 C 1050.58 787.467 998.58 744.63 951.183 705.681 C 924.826 684.022 908.109 670.972 884.991 646.097 C 883.561 618.266 884.229 608.094 886.358 579.955 z"
  },
  {
    "fill": "rgb(19,47,56)",
    "d": "M 1020.7 235.413 C 1068.53 229.226 1127.29 252.204 1160.6 286.404 C 1208.1 335.168 1227.07 411.027 1227.06 477.302 C 1210.57 463.538 1193.12 453.193 1177.33 439.64 C 1143.2 408.018 1130.31 383.365 1107.44 343.418 C 1072.27 281.964 1007.82 242.803 935.893 268.162 C 963.03 248.472 987.194 238.381 1020.7 235.413 z"
  },
  {
    "fill": "url(#Gradient3)",
    "d": "M 1228.34 388.547 C 1252.82 400.139 1282.76 430.588 1293.79 455.035 C 1345.42 569.487 1234.48 651.713 1147.26 693.479 C 1124.61 702.925 1118.23 704.828 1093.79 708.552 C 1168.54 636.148 1253.56 553.317 1238.36 439.352 C 1236 421.671 1232.36 405.886 1228.34 388.547 z"
  },
  {
    "fill": "rgb(215,174,150)",
    "d": "M 881.452 497.002 L 882.732 497.589 C 884.418 506.253 874.852 566.45 873.132 579.174 C 871.606 590.941 870.376 602.745 869.444 614.574 C 864.669 672.413 872.375 719.974 910.644 765.195 C 890.587 758.294 881.264 753.851 863.701 742.161 C 843.901 728.13 827.515 709.82 815.758 688.591 C 785.073 633.435 792.169 565.273 841.337 523.587 C 854.157 512.719 866.809 505.141 881.452 497.002 z"
  },
  {
    "fill": "rgb(169,93,70)",
    "d": "M 956.965 281.397 C 1001.88 277.528 1032.69 288.239 1066.94 317.01 C 1008.61 313.376 949.699 341.034 905.372 377.1 C 899.956 381.506 889.327 385.993 882.759 388.992 C 856.833 400.063 830.698 410.521 806.231 424.485 C 811.652 393.885 823.138 366.29 842.826 342.033 C 871.357 307.523 912.397 285.721 956.965 281.397 z"
  },
  {
    "fill": "rgb(19,47,56)",
    "d": "M 1313.44 550.606 C 1317.2 554.011 1318.15 567.891 1318.91 572.993 C 1328.37 636.628 1294.95 706.409 1234.39 731.811 C 1200.28 746.12 1166.74 742.687 1133.38 728.996 C 1126.56 725.943 1119.72 722.346 1113.04 718.96 C 1134 714.014 1157.37 701.704 1176.46 691.514 C 1236.3 659.565 1292.68 617.948 1313.44 550.606 z"
  },
  {
    "fill": "rgb(215,174,150)",
    "d": "M 1076.91 332.69 C 1082.01 336.249 1103.46 374.059 1109.06 381.974 C 1114.84 390.158 1121.19 400.402 1128.49 409.265 C 1139.5 422.471 1151.6 434.722 1164.67 445.888 C 1185.19 463.061 1213.02 476.919 1223.49 499.249 C 1222.29 512.489 1217.73 525.202 1213.11 537.564 L 1208.33 547.925 C 1137.31 527.74 1091.39 471.33 1083.78 398.129 C 1081.37 375.058 1083.14 355.367 1076.91 332.69 z"
  },
  {
    "fill": "url(#Gradient2)",
    "d": "M 886.8 666.665 C 889.344 668.585 892.66 672.036 895.091 674.337 C 921.065 698.923 950.317 719.948 978.013 742.558 C 1003.5 763.365 1031.8 781.529 1062.59 793.384 C 1064.19 794 1064.32 793.842 1065.52 795.327 L 1063.73 796.244 C 971.186 821.059 896.437 758.421 886.8 666.665 z"
  }
];
/** The logo's deep teal blades. On a teal ground (tone "on-teal") only these turn white; terracotta and peach keep their colours. */
const TEAL = "rgb(19,47,56)";
const ORDER = [0,3,1,5,6,4,2,7,8];

export default function JalinEmblem({ animated = false, size = 96, label, tone = "color", variant = "tenun" }: { animated?: boolean; size?: number; label?: string; tone?: "color" | "on-teal"; variant?: "tenun" | "gelombang" }) {
  return (
    <span className={`jalin-emblem${animated ? " is-live" : ""} v-${variant}`} style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="692 175 700 700" focusable="false">
        <defs>
          <linearGradient id="je-Gradient1" gradientUnits="userSpaceOnUse" x1="1068.53" y1="1262.03" x2="1094.94" y2="1258.21"><stop offset="0" stopColor="rgb(16,37,48)" /><stop offset="1" stopColor="rgb(25,61,70)" /></linearGradient>
          <linearGradient id="je-Gradient2" gradientUnits="userSpaceOnUse" x1="907.5" y1="658.046" x2="1028.03" y2="820.882"><stop offset="0" stopColor="rgb(163,87,62)" /><stop offset="1" stopColor="rgb(198,132,111)" /></linearGradient>
          <linearGradient id="je-Gradient3" gradientUnits="userSpaceOnUse" x1="1248.36" y1="624.441" x2="1123.17" y2="505.332"><stop offset="0" stopColor="rgb(165,88,65)" /><stop offset="1" stopColor="rgb(187,116,95)" /></linearGradient>
        </defs>
        {BLADES.map((b, i) => (
          <g key={i} transform="translate(1042 525)">
            <g className="jalin-blade" style={{ ["--i" as string]: ORDER.indexOf(i) }}>
              <path transform="translate(-1042 -525)" fill={tone === "on-teal" && b.fill === TEAL ? "#fff" : b.fill.replace("url(#", "url(#je-")} d={b.d} />
            </g>
          </g>
        ))}
      </svg>
    </span>
  );
}
